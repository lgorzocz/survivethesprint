/**
 * EditorChrome — the shared VS Code window framing (CLAUDE.md §4).
 *
 * Draws the editor background, the top tab bar (`SurviveTheSprint.js`), and the status
 * bar strip. Reused by every scene so the whole game consistently reads as a
 * real editor window. Scenes add their own content (HUD, code, menu) on top.
 */
import Phaser from "phaser";
import { CHROME, COLORS, VIEW } from "../config/balance.ts";

export function drawEditorChrome(scene: Phaser.Scene): void {
  // editor background
  scene.add
    .rectangle(0, 0, VIEW.width, VIEW.height, COLORS.editorBg)
    .setOrigin(0);

  // top tab bar
  scene.add
    .rectangle(0, 0, VIEW.width, CHROME.tabBarHeight, COLORS.chromeBg)
    .setOrigin(0);
  // filename (measured first so the active-tab width fits it)
  const name = scene.add
    .text(20, CHROME.tabBarHeight / 2, "SurviveTheSprint.js", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#d7ba7d",
    })
    .setOrigin(0, 0.5)
    .setDepth(1);
  const tabW = 20 + name.width + 34; // left pad + text + gap for the unsaved dot
  // active tab (behind the text)
  scene.add
    .rectangle(8, 0, tabW, CHROME.tabBarHeight, COLORS.editorBg)
    .setOrigin(0)
    .setDepth(0);
  // unsaved dot
  scene.add
    .circle(8 + tabW - 16, CHROME.tabBarHeight / 2, 4, 0xd7ba7d)
    .setOrigin(0.5)
    .setDepth(1);

  // gutter strip
  scene.add
    .rectangle(
      0,
      CHROME.tabBarHeight,
      CHROME.gutterWidth,
      VIEW.height - CHROME.tabBarHeight - CHROME.statusBarHeight,
      0x1a1a1a,
    )
    .setOrigin(0);
}

/** The blue bottom status bar. Returns its centre Y for placing HUD text. */
export function drawStatusBar(scene: Phaser.Scene): number {
  const y = VIEW.height - CHROME.statusBarHeight;
  scene.add
    .rectangle(0, y, VIEW.width, CHROME.statusBarHeight, COLORS.statusBar)
    .setOrigin(0);
  return y + CHROME.statusBarHeight / 2;
}
