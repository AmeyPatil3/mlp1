import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

// Connect to your backend signaling server
const socket = io("http://localhost:5000"); // change to your server URL

const Room = ({ roomId, username }) => {
  const localVideoRef = useRef(null);
  const [peers, setPeers] = useState([]); // store other participants
  const peerConnections = useRef({}); // keep track of peer connections
  const localStream = useRef(null);

  // --- Initialize user media & join room ---
  useEffect(() => {
    const init = async () => {
      try {
        // Get camera and mic
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localVideoRef.current.srcObject = stream;
        localStream.current = stream;

        // Join room
        socket.emit("join-room", { roomId, username });

        // Handle new user joined
        socket.on("user-joined", async ({ userId }) => {
          const peerConnection = createPeerConnection(userId);
          stream.getTracks().forEach((track) =>
            peerConnection.addTrack(track, stream)
          );

          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);

          socket.emit("offer", { to: userId, offer });
        });

        // Receive offer
        socket.on("offer", async ({ from, offer }) => {
          const peerConnection = createPeerConnection(from);
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

          stream.getTracks().forEach((track) =>
            peerConnection.addTrack(track, stream)
          );

          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);

          socket.emit("answer", { to: from, answer });
        });

        // Receive answer
        socket.on("answer", async ({ from, answer }) => {
          const connection = peerConnections.current[from];
          await connection.setRemoteDescription(new RTCSessionDescription(answer));
        });

        // Receive ICE candidate
        socket.on("ice-candidate", ({ from, candidate }) => {
          const connection = peerConnections.current[from];
          if (connection) connection.addIceCandidate(new RTCIceCandidate(candidate));
        });

        // User left
        socket.on("user-left", ({ userId }) => {
          if (peerConnections.current[userId]) {
            peerConnections.current[userId].close();
            delete peerConnections.current[userId];
          }
          setPeers((prev) => prev.filter((p) => p.id !== userId));
        });
      } catch (err) {
        console.error("Error accessing media devices.", err);
      }
    };

    init();
    return () => {
      socket.disconnect();
      Object.values(peerConnections.current).forEach((pc) => pc.close());
    };
  }, [roomId]);

  // --- Create Peer Connection ---
  const createPeerConnection = (userId) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { to: userId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      setPeers((prev) => {
        if (prev.find((p) => p.id === userId)) return prev;
        return [...prev, { id: userId, stream }];
      });
    };

    peerConnections.current[userId] = pc;
    return pc;
  };

  return (
    <div className="room-container">
      <div className="video-grid">
        {peers.map((peer) => (
          <video
            key={peer.id}
            ref={(ref) => ref && (ref.srcObject = peer.stream)}
            autoPlay
            playsInline
            className="remote-video"
          />
        ))}
      </div>

      <video
        ref={localVideoRef}
        muted
        autoPlay
        playsInline
        className="local-video"
      />
    </div>
  );
};

export default Room;
