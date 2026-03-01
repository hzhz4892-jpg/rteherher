const wsProto = window.location.protocol === "https:" ? "wss" : "ws";
const ws = new WebSocket(`${wsProto}://${window.location.host}/ws/chat`);

const list = document.getElementById("messages");
const form = document.getElementById("chat-form");
const input = document.getElementById("message");

function addMessage(text) {
  const li = document.createElement("li");
  li.textContent = text;
  list.appendChild(li);
  list.scrollTop = list.scrollHeight;
}

ws.onmessage = (event) => addMessage(event.data);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  ws.send(text);
  input.value = "";
});
