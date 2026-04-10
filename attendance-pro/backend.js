// backend.gs — Google Apps Script用
// =====================================
// このファイルの内容を、新しいGoogle Apps ScriptプロジェクトのEditor（コード.gs）に
// 貼り付けて「ウェブアプリとしてデプロイ」してください。
//
// デプロイ設定:
//   ・実行するユーザー: 自分
//   ・アクセスできるユーザー: 全員（匿名を含む）
// =====================================

// ==========================================
//  CONFIG — ここを書き換えてください
// ==========================================
const CONFIG = {
  // ① スプレッドシートのID（URLの /d/ と /edit の間の文字列）
  SPREADSHEET_ID: "19-u6UVPmgaYV-ujODjGpzsX-faoVkym4jynUuK8AtDk",

  // ② LINE Channel Access Token（長い文字列）
  LINE_ACCESS_TOKEN: "YOZ7UftinQaO3OyBDaloYu4cXzhYtLzmqBzAGNvCIJRg7h+DoqsX0n6OXdfOFZ9vI7/+VIOKgdWLHJ6yBmeAi6kPqz4+FZ3vpHQTBEAQSHA81c9tQLH/8oP8UUyRpnHxvmJ0QlaAjZWiraJeO38tBgdB04t89/1O/w1cDnyilFU=",

  // ③ LINE グループID
  LINE_GROUP_ID: "C5a5b36e27a78ed6cfbb74839a8a9d04e"
};

// ==========================================
//  doPost — メインエントリーポイント
// ==========================================
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No payload found.");
    }

    const payload   = JSON.parse(e.postData.contents);
    const action    = payload.action;
    const userId    = payload.userId   || "user01";
    const userName  = payload.userName || "名前未設定";
    const timestamp = payload.timestamp || new Date().toISOString();
    const ss        = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

    let lineMessage = "";

    // ---- 出勤打刻 ----
    if (action === "clock_in") {
      const sheet   = ss.getSheetByName("打刻記録");
      const dateStr = isoToDate(timestamp);
      const timeStr = isoToTime(timestamp);
      const fullDt  = isoToFull(timestamp);

      // シート列: [日付, 研修生ID, 氏名, 出勤時刻, 退勤時刻, 勤務時間]
      sheet.appendRow([dateStr, userId, userName, timeStr, "", ""]);

      // 課題指示書フォーマット通り
      lineMessage = `【出勤】\n${userName}\n${fullDt}`;

    // ---- 退勤打刻 ----
    } else if (action === "clock_out") {
      const sheet      = ss.getSheetByName("打刻記録");
      const duration   = payload.duration   || "";
      const clockInIso = payload.clockInTime || "";
      const dateStr    = isoToDate(timestamp);
      const timeStr    = isoToTime(timestamp);
      const inTimeStr  = clockInIso ? isoToTime(clockInIso) : "記録なし";

      // 当日・同名の出勤記録（退勤が空）を探して更新
      const data    = sheet.getDataRange().getValues();
      let updated   = false;

      for (let i = data.length - 1; i >= 0; i--) {
        const row = data[i];
        // 列: [0]日付, [1]研修生ID, [2]氏名, [3]出勤時刻, [4]退勤時刻, [5]勤務時間
        const rowDate = String(row[0]).trim();
        const rowName = String(row[2]).trim();
        if (rowDate === dateStr && rowName === userName.trim() && !row[4]) {
          sheet.getRange(i + 1, 5).setValue(timeStr);   // E列: 退勤時刻
          sheet.getRange(i + 1, 6).setValue(duration);  // F列: 勤務時間
          updated = true;
          break;
        }
      }

      // 当日出勤記録が見つからない場合はフォールバック追加
      if (!updated) {
        sheet.appendRow([dateStr, userId, userName, inTimeStr, timeStr, duration]);
      }

      // 課題指示書フォーマット通り
      lineMessage = `【退勤】\n${userName}\n出勤：${inTimeStr}\n退勤：${timeStr}\n勤務：${duration}`;

    // ---- 課題完了報告 ----
    } else if (action === "report_task") {
      const sheet   = ss.getSheetByName("課題完了記録");
      const taskUrl = payload.taskUrl || "";
      const fullDt  = isoToFull(timestamp);

      // シート列: [完了日時, 研修生ID, 氏名, アプリURL, 判定]
      sheet.appendRow([fullDt, userId, userName, taskUrl, "未確認"]);

      // 課題指示書フォーマット通り
      lineMessage = `【🎉課題完了報告🎉】\n研修生：${userName}（${userId}）\n完了：${fullDt}\n\nアプリURL:\n${taskUrl}\n\n確認をお願いします！`;

    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    // LINE通知送信
    sendLine(lineMessage);

    return jsonRes({ status: "success", message: "処理完了" });

  } catch (err) {
    console.error("doPost error:", err);
    return jsonRes({ status: "error", message: String(err) });
  }
}

// プリフライト OPTIONS への返答
function doOptions(e) {
  return jsonRes({ status: "ok" });
}

// ==========================================
//  LINE Push Message
// ==========================================
function sendLine(text) {
  try {
    UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + CONFIG.LINE_ACCESS_TOKEN
      },
      payload: JSON.stringify({
        to: CONFIG.LINE_GROUP_ID,
        messages: [{ type: "text", text: text }]
      })
    });
  } catch (err) {
    console.error("LINE Error:", err);
  }
}

// ==========================================
//  HELPERS
// ==========================================
function jsonRes(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function pad2(n) { return String(n).padStart(2, '0'); }

function isoToDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${pad2(d.getMonth()+1)}/${pad2(d.getDate())}`;
}

function isoToTime(iso) {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function isoToFull(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${pad2(d.getMonth()+1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
