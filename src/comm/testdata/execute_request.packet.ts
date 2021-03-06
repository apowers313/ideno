// <== RECEIVED DATA: execute_request
export const msg: Array<Uint8Array> = [
    Uint8Array.from([60, 73, 68, 83, 124, 77, 83, 71, 62]),
    Uint8Array.from([55, 101, 48, 50, 52, 102, 97, 98, 54, 56, 55, 98, 100, 98, 56, 48, 97, 52, 102, 102, 98, 57, 102, 99, 100, 98, 53, 53, 53, 101, 100, 49, 102, 57, 52, 51, 53, 97, 50, 97, 101, 98, 50, 57, 48, 53, 98, 55, 56, 57, 98, 102, 55, 50, 51, 49, 97, 50, 56, 53, 102, 50, 97, 97]),
    Uint8Array.from([123, 34, 109, 115, 103, 95, 105, 100, 34, 58, 34, 97, 52, 101, 101, 54, 54, 52, 51, 51, 54, 50, 57, 52, 48, 52, 98, 56, 100, 57, 50, 49, 102, 102, 99, 51, 55, 48, 54, 101, 48, 48, 99, 34, 44, 34, 117, 115, 101, 114, 110, 97, 109, 101, 34, 58, 34, 117, 115, 101, 114, 110, 97, 109, 101, 34, 44, 34, 115, 101, 115, 115, 105, 111, 110, 34, 58, 34, 99, 48, 102, 100, 50, 48, 56, 55, 50, 99, 49, 98, 52, 100, 49, 99, 56, 55, 101, 55, 102, 99, 56, 49, 52, 98, 55, 53, 99, 57, 51, 101, 34, 44, 34, 109, 115, 103, 95, 116, 121, 112, 101, 34, 58, 34, 101, 120, 101, 99, 117, 116, 101, 95, 114, 101, 113, 117, 101, 115, 116, 34, 44, 34, 118, 101, 114, 115, 105, 111, 110, 34, 58, 34, 53, 46, 50, 34, 125]),
    Uint8Array.from([123, 125]),
    Uint8Array.from([123, 125]),
    Uint8Array.from([123, 34, 99, 111, 100, 101, 34, 58, 34, 99, 111, 110, 115, 111, 108, 101, 46, 108, 111, 103, 40, 92, 34, 104, 105, 92, 34, 41, 34, 44, 34, 115, 105, 108, 101, 110, 116, 34, 58, 102, 97, 108, 115, 101, 44, 34, 115, 116, 111, 114, 101, 95, 104, 105, 115, 116, 111, 114, 121, 34, 58, 116, 114, 117, 101, 44, 34, 117, 115, 101, 114, 95, 101, 120, 112, 114, 101, 115, 115, 105, 111, 110, 115, 34, 58, 123, 125, 44, 34, 97, 108, 108, 111, 119, 95, 115, 116, 100, 105, 110, 34, 58, 116, 114, 117, 101, 44, 34, 115, 116, 111, 112, 95, 111, 110, 95, 101, 114, 114, 111, 114, 34, 58, 116, 114, 117, 101, 125]),
];
// DECODED DATA:
// header: {
//   msg_id: "a4ee66433629404b8d921ffc3706e00c",
//   username: "username",
//   session: "c0fd20872c1b4d1c87e7fc814b75c93e",
//   msg_type: "execute_request",
//   version: "5.2"
// }
// parent_header: {}
// metadata: {}
// content: {
//   code: 'console.log("hi")',
//   silent: false,
//   store_history: true,
//   user_expressions: {},
//   allow_stdin: true,
//   stop_on_error: true
// }
// buffers: undefined