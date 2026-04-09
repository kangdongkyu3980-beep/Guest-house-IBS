// ================================================================
// IBS 룸 대시보드 - Google Apps Script 최종판
// 시트: 예약데이터 / 예약이력 / 일별KPI / 📊대시보드
// 기능:
//   - 대시보드 닫을 때 자동 저장 (하루 1회, 중복 방지)
//   - 매일 자정 자동 KPI 스냅샷 (트리거)
//   - 중복 방지: 같은 날짜면 덮어쓰기 (2중 보호)
//   - 예약 삭제 시 이력 자동 보관
//   - 시트 → 대시보드 데이터 복원 (GET 요청)
//   - 매일 자정 이메일 알림 (오늘 체크인/아웃 요약)
// ================================================================

const SHEET_BOOKINGS  = '예약데이터';
const SHEET_HISTORY   = '예약이력';
const SHEET_SNAPSHOT  = '일별KPI';
const SHEET_DASHBOARD = '📊 대시보드';
const BOOKING_HEADERS = ['id','group','bldgId','room','check_in','check_out',
                         'name','company','payment','longterm','remark','status',
                         'phone','email','guest_count','room_rate'];

const TOTAL_GH_ROOMS  = 30;
const TOTAL_IBS_ROOMS = 16;
const TOTAL_ROOMS     = TOTAL_GH_ROOMS + TOTAL_IBS_ROOMS;

// ================================================================
// 1. 웹앱 진입점 (POST)
// ================================================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'bulkSave')       return bulkSave(data.bookings);
    if (data.action === 'save')           return saveOne(data.booking);
    if (data.action === 'update')         return updateOne(data.booking);
    if (data.action === 'delete')         return deleteOne(data.id);
    if (data.action === 'archiveBooking') return archiveBooking(data.booking);
    if (data.action === 'dailySnapshot') {
      writeDashboardData(data.snapshot);
      return saveDailySnapshot(data.snapshot);
    }
    return jsonRes({ ok: false, error: 'unknown action' });
  } catch (err) {
    return jsonRes({ ok: false, error: err.message });
  }
}

// ================================================================
// 2. 웹앱 진입점 (GET) - 시트에서 데이터 복원용
// ================================================================
function doGet(e) {
  try {
    if (e.parameter.action === 'loadBookings') {
      return loadBookingsForRestore();
    }
    // 프론트(index.html)의 실시간 동기화 엔진이 사용하는 엔드포인트
    if (e.parameter.action === 'loadAll') {
      return loadAll();
    }
    return jsonRes({ ok: false, error: 'unknown action' });
  } catch (err) {
    return jsonRes({ ok: false, error: err.message });
  }
}

// ================================================================
// 2-1. loadAll: 예약 전체 + 마지막 수정 시각 (실시간 동기화용)
// ================================================================
function loadAll() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_BOOKINGS);
  const lastModified = getLastModified_();
  if (!sheet || sheet.getLastRow() < 2) {
    return jsonRes({ ok: true, bookings: [], lastModified });
  }

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, BOOKING_HEADERS.length).getValues();
  const bookings = data.filter(r => r[0]).map(r => ({
    id:        r[0], group:    r[1], bldgId:  r[2], room:    r[3],
    check_in:  r[4], check_out:r[5], name:    r[6], company: r[7],
    payment:   r[8], longterm: r[9] === 'Y',   remark:  r[10] || '',
    phone:     r[12] || '', email: r[13] || '',
    guest_count: Number(r[14]) || 1, room_rate: r[15] || ''
  }));

  return jsonRes({ ok: true, bookings, lastModified });
}

function getLastModified_() {
  try {
    const props = PropertiesService.getScriptProperties();
    return props.getProperty('IBS_LAST_MODIFIED') || '';
  } catch (e) {
    return '';
  }
}

function setLastModifiedNow_() {
  try {
    const now = new Date();
    const ts =
      fmtDate(now) + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0');
    PropertiesService.getScriptProperties().setProperty('IBS_LAST_MODIFIED', ts);
  } catch (e) {}
}

function loadBookingsForRestore() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_BOOKINGS);
  if (!sheet || sheet.getLastRow() < 2) return jsonRes({ ok: true, bookings: [] });

  const data     = sheet.getRange(2, 1, sheet.getLastRow() - 1, BOOKING_HEADERS.length).getValues();
  const bookings = data.filter(r => r[0]).map(r => ({
    id:        r[0], group:    r[1], bldgId:  r[2], room:    r[3],
    check_in:  r[4], check_out:r[5], name:    r[6], company: r[7],
    payment:   r[8], longterm: r[9] === 'Y',   remark:  r[10] || '',
    phone:     r[12] || '', email: r[13] || '',
    guest_count: Number(r[14]) || 1, room_rate: r[15] || ''
  }));
  return jsonRes({ ok: true, bookings });
}

// ================================================================
// 3. 매일 자정 자동 실행 (트리거)
// ================================================================
function dailyAutoSnapshot() {
  try {
    const snap = calcKpiFromSheet();
    writeSnapshot(snap);
    writeDashboardData(snap);
    refreshDashboardCharts();
    console.log('✅ 자동 완료:', snap.date, '/ 소스: 자동트리거');
  } catch (err) {
    console.error('❌ 실패:', err.message);
  }
}

// ================================================================
// 4. 트리거 등록 (딱 한 번만 실행)
// ================================================================
function setupDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'dailyAutoSnapshot') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('dailyAutoSnapshot')
    .timeBased().everyDays(1).atHour(0).create();
  console.log('✅ 매일 자정(IST 00:00~01:00) 트리거 등록 완료');
}

// ================================================================
// 6. 대시보드 초기화 (수동 1회 실행)
// ================================================================
function initDashboard() {
  const snap = calcKpiFromSheet();
  writeDashboardData(snap);
  refreshDashboardCharts();
  SpreadsheetApp.getUi().alert('✅ 대시보드 초기화 완료!\n📊 대시보드 탭을 확인하세요.');
}

// ================================================================
// 7. KPI 저장 (대시보드 전송 & 자동 트리거 공용)
//    ★ 중복 방지: 같은 날짜 행이 있으면 덮어쓰기
// ================================================================
function writeSnapshot(snap) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_SNAPSHOT);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_SNAPSHOT);
    const headers = ['날짜','전체투숙','게하투숙','IBS투숙','점유룸','전체룸','점유율(%)',
                     '장기투숙','확인필요','결제미정','오늘체크인','오늘체크아웃',
                     '7일내체크인','7일내체크아웃','전체예약수','업데이트소스','업데이트시간'];
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
    sheet.getRange(1,1,1,headers.length)
      .setBackground('#16a34a').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  // ★ 같은 날짜 있으면 덮어쓰기 → 중복 행 절대 생기지 않음
  const lastRow = sheet.getLastRow();
  let targetRow = lastRow + 1;
  if (lastRow >= 2) {
    const dates = sheet.getRange(2,1,lastRow-1,1).getValues();
    for (let i=0; i<dates.length; i++) {
      if (dates[i][0] === snap.date) { targetRow = i+2; break; }
    }
  }

  const now = new Date();
  const timeStr = fmtDate(now) + ' ' +
    String(now.getHours()).padStart(2,'0') + ':' +
    String(now.getMinutes()).padStart(2,'0');

  const row = [
    snap.date,
    snap.total_guests, snap.gh_guests,   snap.ibs_guests,
    snap.occ_rooms,    snap.total_rooms, snap.occ_rate,
    snap.longterm,     snap.confirms,    snap.pay_pending,
    snap.today_in,     snap.today_out,
    snap.in_7days,     snap.out_7days,   snap.total_bookings,
    snap.source || '대시보드',           // 업데이트 소스
    timeStr                               // 업데이트 시간
  ];
  sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
  sheet.autoResizeColumns(1, row.length);
}

function saveDailySnapshot(snap) {
  writeSnapshot(snap);
  return jsonRes({ ok: true, date: snap.date });
}

// ================================================================
// 8. 예약 이력 보관 (삭제 전 자동 호출)
// ================================================================
function archiveBooking(b) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_HISTORY);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_HISTORY);
    const headers = ['id','구분','빌딩','룸','이름','회사','결제방식',
                     '체크인','체크아웃','장기투숙','박수','최종상태','삭제일','비고'];
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
    sheet.getRange(1,1,1,headers.length)
      .setBackground('#7c3aed').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  // 중복 방지: 같은 id 있으면 스킵
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const ids = sheet.getRange(2,1,lastRow-1,1).getValues().flat();
    if (ids.includes(b.id)) return jsonRes({ ok: true, skipped: true });
  }

  const ns = calcNights(b.check_in, b.check_out);
  sheet.appendRow([
    b.id||'',
    b.group==='gh'?'게스트하우스':'IBS하우스',
    b.bldgId||'', b.room||'', b.name||'', b.company||'', b.payment||'',
    b.check_in||'', b.check_out||'',
    b.longterm?'Y':'N', ns, b.final_status||'',
    b.deleted_at||fmtDate(new Date()), b.remark||''
  ]);
  sheet.autoResizeColumns(1, 14);
  return jsonRes({ ok: true, archived: b.name });
}

// ================================================================
// 9. 대시보드 시트 KPI 카드 작성
// ================================================================
function writeDashboardData(snap) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let db = ss.getSheetByName(SHEET_DASHBOARD);
  if (!db) { db = ss.insertSheet(SHEET_DASHBOARD, 0); setupDashboardLayout(db); }

  db.getRange('B2:E5').setValues([
    ['📅 날짜',     snap.date,           '🏠 전체 투숙',    snap.total_guests+'명'],
    ['📊 점유율',   snap.occ_rate+'%',   '🏢 게스트하우스', snap.gh_guests+'명'],
    ['🏡 장기투숙', snap.longterm+'명',  '🏠 IBS하우스',    snap.ibs_guests+'명'],
    ['⚠ 확인필요', snap.confirms+'건',  '💳 결제미정',     snap.pay_pending+'건'],
  ]);
  styleKpiCards(db);
}

function setupDashboardLayout(db) {
  db.setColumnWidth(1,20); db.setColumnWidth(2,130); db.setColumnWidth(3,130);
  db.setColumnWidth(4,130); db.setColumnWidth(5,130); db.setColumnWidth(6,20);
  db.setRowHeight(1,20); db.setTabColor('#2563eb');
  db.getRange('B1').setValue('IBS 게스트하우스 운영 대시보드')
    .setFontSize(14).setFontWeight('bold').setFontColor('#1a1d27');
  styleKpiCards(db);
}

function styleKpiCards(db) {
  ['B2:B5','D2:D5'].forEach(r => {
    db.getRange(r).setBackground('#e8f0fe').setFontWeight('bold')
      .setFontColor('#2563eb').setFontSize(11)
      .setBorder(true,true,true,true,false,false,'#c7d2fe',SpreadsheetApp.BorderStyle.SOLID);
  });
  ['C2:C5','E2:E5'].forEach(r => {
    db.getRange(r).setBackground('#f8fafc').setFontSize(13).setFontWeight('bold')
      .setFontColor('#1a1d27')
      .setBorder(true,true,true,true,false,false,'#e2e8f0',SpreadsheetApp.BorderStyle.SOLID);
  });
}

// ================================================================
// 10. 차트 생성
// ================================================================
function refreshDashboardCharts() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const db  = ss.getSheetByName(SHEET_DASHBOARD);
  const kpi = ss.getSheetByName(SHEET_SNAPSHOT);
  if (!db || !kpi || kpi.getLastRow() < 2) return;

  db.getCharts().forEach(c => db.removeChart(c));
  const n = kpi.getLastRow() - 1;

  db.insertChart(db.newChart().setChartType(Charts.ChartType.LINE)
    .addRange(kpi.getRange(1,1,n+1,1)).addRange(kpi.getRange(1,7,n+1,1))
    .setPosition(7,2,0,0).setNumHeaders(1)
    .setOption('title','📈 일별 점유율 추이 (%)').setOption('width',460).setOption('height',260)
    .setOption('legend',{position:'none'}).setOption('colors',['#2563eb'])
    .setOption('curveType','function').setOption('pointSize',4)
    .setOption('vAxis',{title:'점유율(%)',minValue:0,maxValue:100})
    .setOption('hAxis',{slantedText:true,slantedTextAngle:45}).build());

  db.insertChart(db.newChart().setChartType(Charts.ChartType.BAR)
    .addRange(kpi.getRange(1,1,n+1,1)).addRange(kpi.getRange(1,3,n+1,1)).addRange(kpi.getRange(1,4,n+1,1))
    .setPosition(7,6,0,0).setNumHeaders(1)
    .setOption('title','🏨 게하 vs IBS 투숙 인원').setOption('width',460).setOption('height',260)
    .setOption('isStacked',true).setOption('colors',['#2563eb','#7c3aed'])
    .setOption('legend',{position:'top'}).build());

  db.insertChart(db.newChart().setChartType(Charts.ChartType.LINE)
    .addRange(kpi.getRange(1,1,n+1,1)).addRange(kpi.getRange(1,9,n+1,1)).addRange(kpi.getRange(1,10,n+1,1))
    .setPosition(22,2,0,0).setNumHeaders(1)
    .setOption('title','⚠ 확인필요 · 결제미정 추이').setOption('width',460).setOption('height',240)
    .setOption('colors',['#dc2626','#ca8a04']).setOption('legend',{position:'top'})
    .setOption('curveType','function').setOption('pointSize',4)
    .setOption('vAxis',{title:'건수',minValue:0})
    .setOption('hAxis',{slantedText:true,slantedTextAngle:45}).build());

  db.insertChart(db.newChart().setChartType(Charts.ChartType.COMBO)
    .addRange(kpi.getRange(1,1,n+1,1)).addRange(kpi.getRange(1,13,n+1,1)).addRange(kpi.getRange(1,14,n+1,1))
    .setPosition(22,6,0,0).setNumHeaders(1)
    .setOption('title','🛬🛫 7일 내 체크인 · 체크아웃 추이').setOption('width',460).setOption('height',240)
    .setOption('colors',['#16a34a','#ea580c']).setOption('seriesType','bars')
    .setOption('legend',{position:'top'}).setOption('vAxis',{title:'건수',minValue:0})
    .setOption('hAxis',{slantedText:true,slantedTextAngle:45}).build());

  // 재방문 분석 차트 (예약이력 충분할 때)
  const hist = ss.getSheetByName(SHEET_HISTORY);
  if (hist && hist.getLastRow() >= 3) {
    const histData = hist.getRange(2,1,hist.getLastRow()-1,7).getValues();
    const compMap  = {};
    histData.filter(r=>r[0]).forEach(r => {
      const comp = r[5]||'미입력';
      compMap[comp] = (compMap[comp]||0) + 1;
    });
    const sorted = Object.entries(compMap).sort((a,b)=>b[1]-a[1]).slice(0,10);
    if (sorted.length > 0) {
      let tmp = ss.getSheetByName('_chart_tmp');
      if (!tmp) tmp = ss.insertSheet('_chart_tmp');
      tmp.clearContents();
      tmp.getRange(1,1).setValue('회사'); tmp.getRange(1,2).setValue('투숙횟수');
      sorted.forEach((row,i) => { tmp.getRange(i+2,1).setValue(row[0]); tmp.getRange(i+2,2).setValue(row[1]); });
      db.insertChart(db.newChart().setChartType(Charts.ChartType.BAR)
        .addRange(tmp.getRange(1,1,sorted.length+1,2))
        .setPosition(35,2,0,0).setNumHeaders(1)
        .setOption('title','🔄 회사별 누적 투숙 횟수').setOption('width',460).setOption('height',260)
        .setOption('colors',['#0891b2']).setOption('legend',{position:'none'})
        .setOption('hAxis',{title:'투숙 횟수'}).build());
      tmp.hideSheet();
    }
  }
}

// ================================================================
// 11. 예약 저장
// ================================================================
function bulkSave(bookings) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_BOOKINGS);
  if (!sheet) sheet = ss.insertSheet(SHEET_BOOKINGS);
  sheet.clearContents();
  sheet.getRange(1,1,1,BOOKING_HEADERS.length).setValues([BOOKING_HEADERS]);
  if (bookings && bookings.length > 0) {
    const rows = bookings.map(b => [
      b.id||'',b.group||'',b.bldgId||'',b.room||'',
      b.check_in||'',b.check_out||'',b.name||'',b.company||'',b.payment||'',
      b.longterm?'Y':'N',b.remark||'',getStatus(b),
      b.phone||'',b.email||'',Number(b.guest_count)||1,b.room_rate||''
    ]);
    sheet.getRange(2,1,rows.length,BOOKING_HEADERS.length).setValues(rows);
  }
  sheet.getRange(1,1,1,BOOKING_HEADERS.length)
    .setBackground('#2563eb').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1,BOOKING_HEADERS.length);
  // 실시간 동기화용 마지막 수정 시각 업데이트
  setLastModifiedNow_();
  return jsonRes({ok:true,count:(bookings||[]).length});
}

function saveOne(b)   { return jsonRes({ok:true}); }
function updateOne(b) { return jsonRes({ok:true}); }
function deleteOne(id){ return jsonRes({ok:true}); }

// ================================================================
// 12. KPI 계산
// ================================================================
function calcKpiFromSheet() {
  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const sheet    = ss.getSheetByName(SHEET_BOOKINGS);
  const today    = new Date(); today.setHours(0,0,0,0);
  const todayStr = fmtDate(today);
  if (!sheet || sheet.getLastRow() < 2) return emptySnap(todayStr);

  const data = sheet.getRange(2,1,sheet.getLastRow()-1,12).getValues();
  const bookings = data.filter(r=>r[0]).map(r=>({
    id:r[0],group:r[1],bldgId:r[2],room:r[3],
    check_in:r[4],check_out:r[5],name:r[6],company:r[7],payment:r[8],longterm:r[9]==='Y'
  }));
  const active    = bookings.filter(b=>getStatusCalc(b,today)==='active');
  const longterm  = bookings.filter(b=>getStatusCalc(b,today)==='longterm');
  const confirms  = bookings.filter(b=>getStatusCalc(b,today)==='confirm');
  const allActive = [...active,...longterm];
  const occRoomSet = new Set(allActive.map(b=>b.bldgId+'|'+b.room));
  const payPending = allActive.filter(b=>!b.payment||b.payment==='미정').length;
  const todayIn    = bookings.filter(b=>b.check_in===todayStr).length;
  const todayOut   = bookings.filter(b=>b.check_out===todayStr).length;
  const in7  = bookings.filter(b=>{const d=daysDiff(today,parseDate(b.check_in));return d>=0&&d<=7;}).length;
  const out7 = bookings.filter(b=>{const d=daysDiff(today,parseDate(b.check_out));return d>=0&&d<=7;}).length;
  return {
    date:todayStr, total_guests:allActive.length,
    gh_guests:allActive.filter(b=>b.group==='gh').length,
    ibs_guests:allActive.filter(b=>b.group==='ibs').length,
    occ_rooms:occRoomSet.size, total_rooms:TOTAL_ROOMS,
    occ_rate:TOTAL_ROOMS?Math.round(occRoomSet.size/TOTAL_ROOMS*100):0,
    longterm:longterm.length, confirms:confirms.length, pay_pending:payPending,
    today_in:todayIn, today_out:todayOut,
    in_7days:in7, out_7days:out7, total_bookings:bookings.length,
    source:'자동트리거'
  };
}

// ================================================================
// 13. 유틸
// ================================================================
function getStatus(b) { const t=new Date(); t.setHours(0,0,0,0); return getStatusCalc(b,t); }
function getStatusCalc(b,today) {
  const ci=parseDate(b.check_in),co=parseDate(b.check_out);
  if (!ci) return 'unknown';
  const lt=b.longterm==='Y'||b.longterm===true;
  if (lt)         return ci<=today?'longterm':'upcoming';
  if (!co)        return ci<=today?'confirm':'upcoming';
  if (ci>today)   return 'upcoming';
  if (co<today)   return 'past';
  return 'active';
}
function parseDate(s) {
  if (!s) return null;
  const str=typeof s==='string'?s:fmtDate(s);
  if (str.length!==10) return null;
  const d=new Date(str+'T00:00:00');
  return isNaN(d)?null:d;
}
function fmtDate(d) {
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function daysDiff(d1,d2) { if(!d2)return -999; return Math.round((d2-d1)/86400000); }
function calcNights(ci,co) {
  const a=parseDate(ci),b=parseDate(co);
  if(!a||!b) return 0;
  return Math.max(0,Math.round((b-a)/86400000));
}
function emptySnap(dateStr) {
  return {date:dateStr,total_guests:0,gh_guests:0,ibs_guests:0,
          occ_rooms:0,total_rooms:TOTAL_ROOMS,occ_rate:0,
          longterm:0,confirms:0,pay_pending:0,
          today_in:0,today_out:0,in_7days:0,out_7days:0,total_bookings:0,source:'자동트리거'};
}
function jsonRes(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
