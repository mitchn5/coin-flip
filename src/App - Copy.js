import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/cannon";
import Scene from "./Scene";
import NoiseBackground from "./NoiseBackground";
import { useState, useEffect } from "react";
import { Preferences } from "@capacitor/preferences";
import "./App.css";

export default function App() {
  const [face, setFace] = useState(null);
  const [streak, setStreak] = useState(0);
  const [lastFace, setLastFace] = useState(null);
  const [locked, setLocked] = useState(false);
  const [bestStreak, setBestStreak] = useState({ face: null, count: 0 });

  const [coinColor, setCoinColor] = useState("gold");
  const [headsType, setHeadsType] = useState("default");
  const [tailsType, setTailsType] = useState("default");
  const [showCustomize, setShowCustomize] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // --- Load persisted data on startup (async)
  useEffect(() => {
    const loadData = async () => {
      try {
        const { value } = await Preferences.get({ key: "coinAppData" });
        if (value) {
          const saved = JSON.parse(value);
          setFace(saved.face || null);
          setStreak(saved.streak || 0);
          setLastFace(saved.lastFace || null);
          setBestStreak(saved.bestStreak || { face: null, count: 0 });
        }
      } catch (err) {
        console.warn("Failed to load data:", err);
      }
    };
    loadData();
  }, []);

  // --- Save every time streak or face changes
  useEffect(() => {
    const saveData = async () => {
      try {
        await Preferences.set({
          key: "coinAppData",
          value: JSON.stringify({
            face,
            streak,
            lastFace,
            bestStreak,
          }),
        });
      } catch (err) {
        console.warn("Failed to save data:", err);
      }
    };
    saveData();
  }, [face, streak, lastFace, bestStreak]);

  // --- Listen for coin lock/unlock
  useEffect(() => {
    const handler = (e) => setLocked(e.detail);
    document.addEventListener("coin-locked", handler);
    return () => document.removeEventListener("coin-locked", handler);
  }, []);

  // --- Handle flip result
  const handleResult = (resultFace) => {
    const newStreak = resultFace === lastFace ? streak + 1 : 1;
    setFace(resultFace);
    setStreak(newStreak);
    setLastFace(resultFace);

    // Update best streak if record broken
    setBestStreak((prev) => {
      if (newStreak > prev.count) return { face: resultFace, count: newStreak };
      return prev;
    });
  };

  // --- Flip button handler
  const flipCoin = () => {
    document.dispatchEvent(new Event("flip-coin"));
  };

  // --- Optional: clear saved data
  const resetData = async () => {
    await Preferences.remove({ key: "coinAppData" });
    setFace(null);
    setStreak(0);
    setLastFace(null);
    setBestStreak({ face: null, count: 0 });
  };

  const logCoinData = async () => {
    document.dispatchEvent(new Event("log-data"));
  };

  const redirect = () => {
    window.location.href = "https://twitter.com/michaelnlegit";
  }

  //camera position, [0, 6, 10], [side rotation, up/down rotation, forward/back transforming], fov 60
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#222", position: "relative" }}>
      <Canvas shadows camera={{ position: [0, 6, 10], fov: 60 }}>
        <Physics gravity={[0, -9.81, 0]}>
          <NoiseBackground />
          <Scene
            onResult={handleResult}
            coinColor={coinColor}
            headsType={headsType}
            tailsType={tailsType}
          />
        </Physics>
      </Canvas>

      <div
        style={{
          position: "absolute",
          top: "5px",
          left: face ? "60px" : "110px",
          transform: "translateX(-50%)",
          color: "white",
          fontFamily: "Arial, sans-serif",
          userSelect: "none",
        }}
      >

        <div style={{ marginTop: "12px", lineHeight: "1.6em" }}>
          {face ? (
            <>
              <div>
                <img
                  src="/icons/fire.svg"
                  alt="Settings"
                  style={{ width: "25px", height: "25px", filter: "invert(1)" }}
                />{" "}
                <strong>
                  {streak} {face}
                </strong>
              </div>
              <div>
                <img
                  src="/icons/trophy.svg"
                  alt="Settings"
                  style={{ width: "22px", height: "22px", filter: "invert(1)" }}
                />{" "}
                <strong>
                  {bestStreak.count} {bestStreak.face || "—"}
                </strong>
              </div>
            </>
          ) : (
            <div>
              <b>Flip Coin</b> to start your Streak
            </div>
          )}
        </div>
      </div>

      {/* ⚙ Settings Button */}
      <button
        onClick={() => setShowSettings(prev => !prev)} // toggle open/close
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "8px",
          zIndex: 10,
        }}
      >
        <img
          src="/icons/settings.svg"
          alt="Settings"
          style={{ width: "28px", height: "28px", filter: "invert(1)" }}
        />
      </button>

      {/* ⚙ Settings Popup with Backdrop */}
      {showSettings && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowSettings(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0, 0, 0, 0.6)",
              zIndex: 15,
            }}
          ></div>

          {/* Popup */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "#333",
              padding: "24px 32px",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              color: "white",
              fontFamily: "Arial, sans-serif",
              textAlign: "center",
              zIndex: 20,
            }}
          >
            <h3 style={{ marginBottom: "16px" }}>Settings</h3>

            <button
              onClick={() => setShowResetConfirm(true)} // show confirmation
              style={{
                display: "block",
                width: "100%",
                fontSize: "14px",
                background: "#444",
                color: "white",
                border: "1px solid #666",
                padding: "8px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                marginBottom: "12px",
              }}
            >
              Reset Stats
            </button>

            <button
              onClick={() => redirect()}
              style={{
                display: "block",
                width: "100%",
                fontSize: "14px",
                background: "plum",
                color: "white",
                border: "1px solid #666",
                padding: "8px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                marginBottom: "12px",
              }}
            >
              Follow Me 🙂
            </button>

            <button
              onClick={() => setShowSettings(false)}
              style={{
                display: "block",
                width: "100%",
                fontSize: "14px",
                background: "#222",
                color: "white",
                border: "1px solid #555",
                padding: "8px 12px",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </>
      )}

      {/* ✅ Reset Confirmation Popup */}
      {showResetConfirm && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowResetConfirm(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0, 0, 0, 0.6)",
              zIndex: 25,
            }}
          ></div>

          {/* Confirmation Box */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "#333",
              padding: "24px 32px",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              color: "white",
              fontFamily: "Arial, sans-serif",
              textAlign: "center",
              zIndex: 30,
              minWidth: "240px",
            }}
          >
            <h3 style={{ marginBottom: "16px" }}>Confirm Reset</h3>
            <p>Reset your Streak? This cannot be reverted</p>

            <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between" }}>
              <button
                onClick={() => {
                  resetData();
                  setShowResetConfirm(false);
                  setShowSettings(false); // optional: close settings too
                }}
                style={{
                  fontSize: "14px",
                  background: "plum",
                  color: "black",
                  border: "none",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  flex: 1,
                  marginRight: "8px",
                }}
              >
                Yes
              </button>

              <button
                onClick={() => setShowResetConfirm(false)}
                style={{
                  fontSize: "14px",
                  background: "#555",
                  color: "white",
                  border: "none",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  flex: 1,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}


      {/* 🎯 HTML UI Overlay (unchanged) */}
      <div
        style={{
          position: "absolute",
          bottom: "40px",
          left: "50%",
          transform: "translateX(-50%)",
          color: "white",
          textAlign: "center",
          fontFamily: "Arial, sans-serif",
          userSelect: "none",
        }}
      >
        {/* Flip Button */}
        <button
          onClick={flipCoin}
          disabled={locked}
          style={{
            padding: "12px 24px",
            fontSize: "18px",
            background: locked ? "#777" : "plum",
            color: "black",
            border: "none",
            borderRadius: "8px",
            cursor: locked ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
        >
          {locked ? "Flipping..." : "Flip Coin"}
        </button>
      </div>
      {/* 🎨 Customization Button */}
      <button
        onClick={() => setShowCustomize(prev => !prev)}
        style={{
          position: "absolute",
          bottom: "30px",
          right: "20px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "8px",
          zIndex: 10,
        }}
      >
        <img
          src="/icons/brush.svg"
          alt="Customize"
          style={{ width: "28px", height: "28px", filter: "invert(1)" }}
        />
      </button>

      {/* 🎨 Customization Popup */}
      {showCustomize && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowCustomize(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0, 0, 0, 0.6)",
              zIndex: 15,
            }}
          ></div>

          {/* Popup */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "#333",
              padding: "10px 20px",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              color: "white",
              fontFamily: "Arial, sans-serif",
              textAlign: "center",
              zIndex: 20,
              minWidth: "300px",
            }}
          >
            <h3 style={{ marginBottom: "20px" }}>Customize Coin</h3>

            {/* Coin Color */}
            <div style={{ marginBottom: "12px", textAlign: "left" }}>
              <label>Coin Color:&nbsp;</label>
              <select
                value={coinColor}
                onChange={(e) => setCoinColor(e.target.value)}
                style={{ padding: "6px 8px", borderRadius: "6px", background: "#222", color: "white" }}
              >
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
              </select>
            </div>

            {/* Heads Texture */}
            <div style={{ marginBottom: "12px", textAlign: "left" }}>
              <label>Heads Texture:&nbsp;</label>
              <select
                value={headsType}
                onChange={(e) => setHeadsType(e.target.value)}
                style={{ padding: "6px 8px", borderRadius: "6px", background: "#222", color: "white" }}
              >
                <option value="default">Default</option>
                <option value="alt">Alternative</option>
              </select>
            </div>

            {/* Tails Texture */}
            <div style={{ marginBottom: "12px", textAlign: "left" }}>
              <label>Tails Texture:&nbsp;</label>
              <select
                value={tailsType}
                onChange={(e) => setTailsType(e.target.value)}
                style={{ padding: "6px 8px", borderRadius: "6px", background: "#222", color: "white" }}
              >
                <option value="default">Default</option>
                <option value="alt">Alternative</option>
              </select>
            </div>

            <button
              onClick={() => setShowCustomize(false)}
              style={{
                marginTop: "16px",
                background: "#555",
                color: "white",
                border: "none",
                padding: "8px 14px",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </>
      )}
    </div>
  );
}
