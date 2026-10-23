import axios from "axios";

// Dedicated client for the OpenAI Realtime WebRTC SDP exchange. It authenticates with a short-lived
// session secret minted by our API, never with a long-lived key, and must not carry our auth header.
const realtimeAxios = axios.create({
    timeout: 20000,
});

export default realtimeAxios;
