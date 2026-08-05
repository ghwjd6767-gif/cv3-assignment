const OPTIONS = [
  { value: 'live', label: '라이브 방송' },
  { value: 'hs', label: '홈쇼핑' },
];

const buttonStyle = {
  padding: '6px 14px',
  border: '1px solid #ccc',
  background: '#fff',
  cursor: 'pointer',
};

const activeButtonStyle = {
  ...buttonStyle,
  background: '#333',
  color: '#fff',
  borderColor: '#333',
};

function TypeToggle({ value, onChange }) {
  const handleClick = (newValue) => {
    if (newValue === value) return;
    onChange(newValue);
  };

  return (
    <div className="type-toggle">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? 'active' : ''}
          style={option.value === value ? activeButtonStyle : buttonStyle}
          onClick={() => handleClick(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default TypeToggle;
