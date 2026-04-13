// backend.js - Google Apps Script用
// この内容を新規Google Apps Scriptプロジェクトの「コード.gs」に貼り付け、「ウェブアプリ」としてデプロイしてください。

const CONFIG = {
  // ※1. 記録先となるGoogleスプレッドシートのID
  SPREADSHEET_ID: "YOUR_SPREADSHEET_ID_HERE",
  // ※2. ご自身のLINE Channel Access Token
  LINE_ACCESS_TOKEN: "YOUR_LINE_ACCESS_TOKEN_HERE",
  // ※3. 通知先のLINE Group ID (または User ID)
  LINE_GROUP_ID: "YOUR_LINE_GROUP_ID_HERE"
};

/**
 * HTTP POST リクエストを受け取り、処理を分岐する関数
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No payload found");
    }
    
    // リクエストのJSONを厳密にパース
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action; 
    const userName = payload.userName;
    const timestamp = payload.timestamp || new Date().toISOString();
    
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let messageText = "";
    
    if (action === "clock_in") {
      const sheet = ss.getSheetByName("打刻記録");
      const timeStr = formatTimeFromIso(timestamp);
      const dateStr = extractDateFromIso(timestamp);
      
      // シート仕様: [氏名, 日付, 出勤時刻, 退勤時刻, 勤務時間] 
      // 出勤時は「出勤時刻」までを書き込む
      sheet.appendRow([userName, dateStr, timeStr, "", ""]);
      
      // 改行を入れてレイアウトを整える
      messageText = `【出勤】\n${userName} さんが打刻しました。\n（時刻: ${timeStr}）`;
      
    } else if (action === "clock_out") {
      const sheet = ss.getSheetByName("打刻記録");
      const duration = payload.duration;
      const timeStr = formatTimeFromIso(timestamp);
      const dateStr = extractDateFromIso(timestamp);
      
      // その日の「出勤データ」との紐付け処理
      const data = sheet.getDataRange().getValues();
      let updated = false;
      
      // リストの下（最新）から探索して、今日の出勤記録（退勤が空）を探す
      for (let i = data.length - 1; i >= 0; i--) {
        const row = data[i];
        // dataの順番: [0]氏名, [1]日付, [2]出勤時刻, [3]退勤時刻, [4]勤務時間
        if (row[0] === userName && row[1] == dateStr && !row[3]) {
          // シートは1始まりなので行番号は i+1。列4と列5を上書き
          sheet.getRange(i + 1, 4).setValue(timeStr);   // D列: 退勤時刻
          sheet.getRange(i + 1, 5).setValue(duration); // E列: 勤務時間
          updated = true;
          break;
        }
      }
      
      // もし当日出勤記録が見つからなければ、一番下へ新規追加（フォールバック）
      if (!updated) {
        sheet.appendRow([userName, dateStr, "記録なし", timeStr, duration]);
      }
      
      messageText = `【退勤】\n${userName} さんが打刻しました。\n（勤務時間: ${duration}）`;
      
    } else if (action === "report_task") {
      const sheet = ss.getSheetByName("課題完了記録");
      const taskUrl = payload.taskUrl;
      const timeStr = formatTimeFromIso(timestamp);
      const dateStr = extractDateFromIso(timestamp);
      
      // シート仕様: [氏名, 日付, 時刻, 課題URL]
      sheet.appendRow([userName, dateStr, timeStr, taskUrl]);
      
      messageText = `【課題報告】\n${userName} さんが課題を提出しました。\nURL: ${taskUrl}`;
    } else {
      throw new Error(`Unknown action: ${action}`);
    }
    
    // LINE通知を発行
    sendLineNotification(messageText);

    // 適切な ContentService を使用してCORSに安全なJSON応答を返す
    return createJsonResponse({ status: "success", message: "処理が完了しました" });

  } catch (error) {
    console.error("doPost Error:", error);
    return createJsonResponse({ status: "error", message: error.toString() });
  }
}

/**
 * CORSエラー対策: プリフライト(OPTIONS)への返答
 */
function doOptions(e) {
  return createJsonResponse({ status: "ok" });
}

/**
 * LINE Messaging API通信 (エラーを握り潰してシステムダウンを防ぐ)
 */
function sendLineNotification(text) {
  const url = "https://api.line.me/v2/bot/message/push";
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${CONFIG.LINE_ACCESS_TOKEN}`
  };
  const payload = {
    "to": CONFIG.LINE_GROUP_ID,
    "messages": [{
      "type": "text",
      "text": text
    }]
  };
  
  try {
    UrlFetchApp.fetch(url, {
      "method": "post",
      "headers": headers,
      "payload": JSON.stringify(payload)
    });
  } catch (error) {
    // 例外処理：LINE APIのフェッチでエラーが起きてもGASプロセスはクラッシュさせない
    console.error("LINE Notify Error: ", error.toString());
  }
}

// ==== ヘルパー関数 ====

/** JSON文字列を含むレスポンスを適切なMIMEタイプで生成 */
function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function extractDateFromIso(isoString) {
  const d = new Date(isoString);
  return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
}

function formatTimeFromIso(isoString) {
  const d = new Date(isoString);
  const hh = ("0" + d.getHours()).slice(-2);
  const mm = ("0" + d.getMinutes()).slice(-2);
  return `${hh}:${mm}`;
}
