const socket = io("http://localhost:5003/socket", {
  transports: ["websocket"],
  upgrade: false,
});

socket.on("connect", () => {
  console.log("Connected to the server!");
});

socket.on("stream", (data) => {
  console.log("Data received:", data);
});

document.getElementById("fileInput").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      socket.on("stream", (data) => {
        console.log("Data received:", data);
      });

      const imageBlob = new Blob([e.target.result], { type: file.type });
      imageBlob.arrayBuffer().then((buffer) => {
        const base64Image = btoa(
          String.fromCharCode.apply(null, new Uint8Array(buffer))
        );
        socket.emit("stream", {}, base64Image);
      });
    };
    reader.readAsArrayBuffer(file);
  }
});
