// hands.js (stable)
// Provides: window.HandTracker
//   HandTracker.start()
//   HandTracker.getHand() -> { landmarks, ts } or null

(() => {
  const HandTracker = {
    _hands: null,
    _camera: null,
    _video: null,
    _latest: null,
    _ready: false,

    async start() {
      if (this._ready) return;

      // hidden video
      const video = document.createElement("video");
      video.setAttribute("playsinline", "");
      video.muted = true;
      video.autoplay = true;

      // keep it hidden (we draw skeleton ourselves)
      video.style.position = "fixed";
      video.style.right = "12px";
      video.style.bottom = "12px";
      video.style.width = "10px";
      video.style.height = "10px";
      video.style.opacity = "0";
      video.style.pointerEvents = "none";
      document.body.appendChild(video);
      this._video = video;

      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      hands.onResults((results) => {
        const ts = performance.now();
        const lm = results.multiHandLandmarks?.[0];
        this._latest = lm ? { landmarks: lm, ts } : null;
      });

      this._hands = hands;

      // MediaPipe camera helper
      this._camera = new Camera(video, {
        onFrame: async () => {
          await hands.send({ image: video });
        },
        width: 640,
        height: 480,
      });

      try {
        this._camera.start();
        this._ready = true;
      } catch (e) {
        console.error("Camera start failed:", e);
        alert("Camera failed. Close Zoom/Teams, allow camera permission, then reload.");
      }
    },

    getHand() {
      return this._latest;
    }
  };

  window.HandTracker = HandTracker;
})();