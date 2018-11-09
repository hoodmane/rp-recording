import * as React from 'react';
import * as CodeMirror from 'codemirror';

import {Recorder, RecorderConfigureComponent, RecorderPlugin} from '../recorder';

import {Player, Utils, ReplayData} from 'ractive-player';
const {bind, whitelist} = Utils.misc;

interface CMSelection {
  anchor: CodeMirror.Position;
  head: CodeMirror.Position;
}

interface Change {
  from: CodeMirror.Position;
  to: CodeMirror.Position;
  text: string[];
  removed: string[];
}

type CaptureData = ReplayData<
  ['command', string] |
  ['cursor', CodeMirror.Position] |
  ['selection', CMSelection] |
  ['text', Change]
>;

const keyboardIcon = (
  <g>
    <g transform="translate(-138.61 -857.23)">
      <rect
        style={{
          strokeLinejoin: "round",
          stroke: '#FFF',
          strokeLinecap: "round",
          strokeWidth: 3.8521,
          fill: "#FFF"
        }}
        rx="9.4681"
        ry="14.97"
        height="58.455"
        width="121.82"
        y="931.93"
        x="171.45"
      />
      <path
        style={{
          stroke: "#000",
          strokeDasharray: "4.9175124 4.9175124",
          strokeWidth: 4.9175,
          fill: "none"
        }}
        d="m184.06 947.36h94.08"
      />
      <path
          style={{
            stroke:"#000",
            strokeDasharray: "4.9175124 4.9175124",
            strokeWidth: 4.9175,
            fill:"none"
          }}
          d="m184.06 957.05h94.08"
      />
      <path
        style={{
          stroke: "#000",
          strokeDasharray: "4.9175124 4.9175124",
          strokeWidth: 4.9175,
          fill: "none"
        }}
        d="m184.06 966.75h94.08"
      />
      <path
        style={{
          stroke: "#FFF",
          strokeWidth: 4.9175,
          fill: "none"
        }}
        d="m184.06 977.23h94.08"
      />
      <path
        style={{
          stroke: "#FFF",
          strokeLinecap: "round",
          strokeWidth: 4.3986,
          fill: "none"
        }}
        d="m278.67 929.84s8.86-13.98-0.31-21.47c-10.76-8.79-20.81 8.66-36.55-3.07"
      />
    </g>
  </g>
);

const LOCAL_STORAGE_RECORDINGS_KEY = 'Controls.KeyRecorder recordings';

// the actual thingy that gets exported
export default class KeyRecorder implements Recorder {
  private captureData: CaptureData;
  private cm: CodeMirror.Editor;

  private captureStart: number;
  private pauseTime: number;
  private lastPauseTime: number;
  private paused: boolean;

  constructor(player: Player) {
    bind(this, ['captureCursor', 'captureKey', 'captureKeySequence']);

    this.cm = player[Symbol.for('KeyRecorder target')];
    console.log(this.cm);

    // persistence
/*    on(window, 'beforeunload', () => {
      localStorage.setItem(LOCAL_STORAGE_RECORDINGS_KEY, JSON.stringify(this.captureData));
    });*/

    // recording stuff
//    this.captureData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_RECORDINGS_KEY)) || [];
  }

  beginRecording(baseTime: number) {
    this.captureStart = baseTime;
    this.captureData = [];
    this.paused = false;
    this.pauseTime = 0;

    this.cm.on('change', this.captureKey);
    this.cm.on('cursorActivity', this.captureCursor);
    this.cm.on('keyHandled', this.captureKeySequence);
  }

  pauseRecording(time: number) {
    this.paused = true;
    this.lastPauseTime = time;
  }

  resumeRecording(time: number) {
    this.pauseTime += time - this.lastPauseTime;
    this.paused = false;
  }

  async endRecording() {
    this.cm.off('change', this.captureKey);
    this.cm.off('cursorActivity', this.captureCursor);
    this.cm.off('keyHandled', this.captureKeySequence);

    for (let i = this.captureData.length - 1; i >= 1; --i) {
      this.captureData[i][0] -= this.captureData[i-1][0];
    }
    for (let i = 0; i < this.captureData.length; ++i) {
      this.captureData[i][0] = formatNum(this.captureData[i][0]);
    }

    return this.captureData;
  }

  captureCursor(cm: CodeMirror.Editor) {
    if (this.paused) return;

    const selection = cm.getDoc().listSelections()[0],
          anchor = whitelist(selection.anchor, ['line', 'ch']),
          head = whitelist(selection.head, ['line', 'ch']);

    if (anchor.line === head.line && anchor.ch === head.ch) {
      this.captureData.push([
        this.getTime(),
        ['cursor', whitelist(anchor, ['line', 'ch'])]
      ]);
    } else {
      this.captureData.push([
        this.getTime(),
        ['selection', {anchor, head}]
      ]);
    }
  };

  captureKey(cm: CodeMirror.Editor, {from, to, text, removed, origin}: CodeMirror.EditorChange) {
    if (this.paused) return;

    this.captureData.push([
      this.getTime(),
      [
        'text',
        {
          from: whitelist(from, ['line', 'ch']),
          to: whitelist(to, ['line', 'ch']),
          text,
          removed
        }
      ]
    ]);
  }

  captureKeySequence(cm: CodeMirror.Editor, sequence: string) {
    if (this.paused) return;

    this.captureData.push([this.getTime(), ['command', sequence]]);
  }

  getTime() {
    return performance.now() - this.captureStart - this.pauseTime;
  }
}

/* helper functions */
// function lookupKeyForEditor(cm, name, handle) {
//   for (let i = 0; i < cm.state.keyMaps.length; i++) {
//     const result = CodeMirror.lookupKey(name, cm.state.keyMaps[i], handle, cm);
//     if (result) return result;
//   }
//   return (cm.options.extraKeys && CodeMirror.lookupKey(name, cm.options.extraKeys, handle, cm))
//     || CodeMirror.lookupKey(name, cm.options.keyMap, handle, cm)
// }

export class KeyConfigureComponent extends RecorderConfigureComponent {
  render() {
    const classNames = ['recorder-plugin-icon']

    if (this.state.active)
      classNames.push('active');

    return (
      <div className="recorder-plugin" title="Record keys">
        <svg className="recorder-plugin-icon" height="36" width="36" viewBox="0 0 187.5 187.5" onClick={this.toggleActive}>
          <rect x="0" y="0" height="187.5" width="187.5" fill={this.state.active ? "red" : "#222"}/>
          {keyboardIcon}
        </svg>
        <span className="recorder-plugin-name">Keys</span>
      </div>
    );
  }
}

export function KeySaveComponent(props: {data: CaptureData}) {
  return (
    <>
      <th key="head" scope="row">
        <svg className="recorder-plugin-icon" height="36" width="36" viewBox="0 0 187.5 187.5">
          <rect x="0" y="0" height="187.5" width="187.5" fill="#222"/>
          {keyboardIcon}
        </svg>
      </th>
      <td key="cell">
        <textarea readOnly value={JSON.stringify(props.data)}></textarea>
      </td>
    </>
  );
}

export const KeyRecorderPlugin = {
  name: "KeyRecorder",
  recorder: KeyRecorder,
  configureComponent: KeyConfigureComponent,
  saveComponent: KeySaveComponent
};


function formatNum(x: number): number {
  return parseFloat(x.toFixed(2));
}
