function parseStartTime(startTime) {
  if (!startTime) return '-';

  const str = String(startTime);
  let year;
  let month;
  let day;
  let hour;
  let minute;

  if (str.length === 10) {
    year = 2000 + Number(str.slice(0, 2));
    month = Number(str.slice(2, 4));
    day = Number(str.slice(4, 6));
    hour = Number(str.slice(6, 8));
    minute = Number(str.slice(8, 10));
  } else if (str.length === 12) {
    year = Number(str.slice(0, 4));
    month = Number(str.slice(4, 6));
    day = Number(str.slice(6, 8));
    hour = Number(str.slice(8, 10));
    minute = Number(str.slice(10, 12));
  } else {
    return str;
  }

  if ([year, month, day, hour, minute].some((n) => Number.isNaN(n))) {
    return str;
  }

  const pad = (n) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}`;
}

function formatNumber(value) {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') return value.toLocaleString();
  return value;
}

function formatAmount(value) {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') return `${value.toLocaleString()}원`;
  return value;
}

const cellStyle = { padding: '6px 10px', borderBottom: '1px solid #ddd', textAlign: 'left' };

const titleCellStyle = {
  ...cellStyle,
  maxWidth: 300,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

function BroadcastTable({ data = [], loading, error, type }) {
  if (loading && data.length === 0) {
    return <p>불러오는 중...</p>;
  }

  if (error && data.length === 0) {
    return <p>데이터를 불러오지 못했습니다</p>;
  }

  if (!loading && data.length === 0) {
    return <p>표시할 방송이 없습니다</p>;
  }

  const viewMetricLabel = type === 'live' ? '조회수' : '시청률';

  return (
    <div>
      {error && data.length > 0 && (
        <p style={{ color: '#b00020', fontSize: 12 }}>최신 데이터 갱신 실패, 이전 데이터 표시 중</p>
      )}
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={cellStyle}>방송정보</th>
            <th style={cellStyle}>분류</th>
            <th style={cellStyle}>방송시간</th>
            <th style={cellStyle}>{viewMetricLabel}</th>
            <th style={cellStyle}>판매량</th>
            <th style={cellStyle}>매출액</th>
            <th style={cellStyle}>상품수</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              <td style={titleCellStyle} title={item.title}>{item.title}</td>
              <td style={cellStyle}>{item.category || '-'}</td>
              <td style={cellStyle}>{parseStartTime(item.startTime)}</td>
              <td style={cellStyle}>{formatNumber(item.viewMetric)}</td>
              <td style={cellStyle}>{formatNumber(item.salesCount)}</td>
              <td style={cellStyle}>{formatAmount(item.salesAmount)}</td>
              <td style={cellStyle}>{item.itemCount ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BroadcastTable;
