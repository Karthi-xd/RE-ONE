.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.window {
  width: 600px;
  max-height: 80vh;
  background: #1c1a16;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  color: #f4e7ca;
  font-family: sans-serif;
}

.titlebar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #2a261f;
  font-weight: bold;
}

.closeBtn {
  background: none;
  border: none;
  color: #f4e7ca;
  cursor: pointer;
  font-size: 16px;
}

.body {
  padding: 16px;
  overflow-y: auto;
}

.inputRow {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.input {
  flex: 1;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #3a352c;
  background: #12100d;
  color: #f4e7ca;
}

.searchBtn {
  padding: 8px 14px;
  border-radius: 4px;
  border: none;
  background: #6a5638;
  color: #f4e7ca;
  cursor: pointer;
}

.status {
  font-size: 13px;
  opacity: 0.7;
  margin-bottom: 12px;
}

.card {
  background: #24211b;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 10px;
}

.card h4 {
  margin: 0 0 6px;
}

.meta, .source {
  font-size: 12px;
  opacity: 0.6;
}

.snippet {
  margin: 6px 0;
  font-size: 14px;
  line-height: 1.4;
}