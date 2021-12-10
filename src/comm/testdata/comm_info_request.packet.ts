// <== RECEIVED DATA: comm_info_request
export const msg: Array<Uint8Array> = [
    Uint8Array.from([60, 73, 68, 83, 124, 77, 83, 71, 62]),
    Uint8Array.from([101, 52, 54, 99, 100, 102, 101, 50, 57, 54, 49, 99, 56, 98, 97, 102, 102, 100, 100, 55, 48, 50, 54, 97, 53, 50, 54, 100, 57, 97, 49, 51, 99, 52, 48, 53, 48, 50, 53, 51, 48, 100, 100, 56, 98, 48, 48, 100, 50, 102, 102, 50, 49, 53, 57, 100, 56, 100, 102, 53, 101, 49, 54, 98]),
    Uint8Array.from([123, 34, 109, 115, 103, 95, 105, 100, 34, 58, 34, 101, 50, 49, 101, 55, 54, 98, 53, 48, 49, 97, 48, 52, 57, 55, 51, 56, 56, 55, 48, 55, 56, 56, 99, 49, 97, 56, 97, 49, 98, 101, 55, 34, 44, 34, 117, 115, 101, 114, 110, 97, 109, 101, 34, 58, 34, 117, 115, 101, 114, 110, 97, 109, 101, 34, 44, 34, 115, 101, 115, 115, 105, 111, 110, 34, 58, 34, 99, 48, 102, 100, 50, 48, 56, 55, 50, 99, 49, 98, 52, 100, 49, 99, 56, 55, 101, 55, 102, 99, 56, 49, 52, 98, 55, 53, 99, 57, 51, 101, 34, 44, 34, 109, 115, 103, 95, 116, 121, 112, 101, 34, 58, 34, 99, 111, 109, 109, 95, 105, 110, 102, 111, 95, 114, 101, 113, 117, 101, 115, 116, 34, 44, 34, 118, 101, 114, 115, 105, 111, 110, 34, 58, 34, 53, 46, 50, 34, 125]),
    Uint8Array.from([123, 125]),
    Uint8Array.from([123, 125]),
    Uint8Array.from([123, 34, 116, 97, 114, 103, 101, 116, 95, 110, 97, 109, 101, 34, 58, 34, 106, 117, 112, 121, 116, 101, 114, 46, 119, 105, 100, 103, 101, 116, 34, 125]),
];
// DECODED DATA:
// header: {
//   msg_id: "e21e76b501a049738870788c1a8a1be7",
//   username: "username",
//   session: "c0fd20872c1b4d1c87e7fc814b75c93e",
//   msg_type: "comm_info_request",
//   version: "5.2"
// }
// parent_header: {}
// metadata: {}
// content: { target_name: "jupyter.widget" }
// buffers: undefined