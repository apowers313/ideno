const crypto = require("crypto");

const messageFrames = [
    Uint8Array.from([0x3c, 0x49, 0x44, 0x53, 0x7c, 0x4d, 0x53, 0x47, 0x3e]),
    Uint8Array.from([0x61, 0x65, 0x30, 0x30, 0x38, 0x32, 0x66, 0x63, 0x36, 0x30, 0x61, 0x66, 0x31, 0x61, 0x31, 0x63, 0x65, 0x38, 0x65, 0x35, 0x37, 0x33, 0x38, 0x66, 0x62, 0x62, 0x36, 0x32, 0x39, 0x33, 0x35, 0x35, 0x61, 0x37, 0x39, 0x30, 0x63, 0x32, 0x34, 0x39, 0x63, 0x38, 0x35, 0x32, 0x32, 0x32, 0x36, 0x30, 0x33, 0x38, 0x33, 0x65, 0x66, 0x37, 0x38, 0x34, 0x31, 0x61, 0x30, 0x37, 0x33, 0x37, 0x39, 0x65]),
    Uint8Array.from([0x7b, 0x22, 0x6d, 0x73, 0x67, 0x5f, 0x69, 0x64, 0x22, 0x3a, 0x20, 0x22, 0x65, 0x33, 0x34, 0x61, 0x38, 0x63, 0x66, 0x38, 0x33, 0x31, 0x36, 0x64, 0x34, 0x66, 0x33, 0x34, 0x38, 0x66, 0x61, 0x36, 0x35, 0x64, 0x31, 0x38, 0x61, 0x39, 0x33, 0x65, 0x64, 0x38, 0x62, 0x30, 0x5f, 0x39, 0x31, 0x39, 0x32, 0x30, 0x5f, 0x30, 0x22, 0x2c, 0x20, 0x22, 0x6d, 0x73, 0x67, 0x5f, 0x74, 0x79, 0x70, 0x65, 0x22, 0x3a, 0x20, 0x22, 0x6b, 0x65, 0x72, 0x6e, 0x65, 0x6c, 0x5f, 0x69, 0x6e, 0x66, 0x6f, 0x5f, 0x72, 0x65, 0x71, 0x75, 0x65, 0x73, 0x74, 0x22, 0x2c, 0x20, 0x22, 0x75, 0x73, 0x65, 0x72, 0x6e, 0x61, 0x6d, 0x65, 0x22, 0x3a, 0x20, 0x22, 0x61, 0x6d, 0x70, 0x6f, 0x77, 0x65, 0x72, 0x22, 0x2c, 0x20, 0x22, 0x73, 0x65, 0x73, 0x73, 0x69, 0x6f, 0x6e, 0x22, 0x3a, 0x20, 0x22, 0x65, 0x33, 0x34, 0x61, 0x38, 0x63, 0x66, 0x38, 0x33, 0x31, 0x36, 0x64, 0x34, 0x66, 0x33, 0x34, 0x38, 0x66, 0x61, 0x36, 0x35, 0x64, 0x31, 0x38, 0x61, 0x39, 0x33, 0x65, 0x64, 0x38, 0x62, 0x30, 0x22, 0x2c, 0x20, 0x22, 0x64, 0x61, 0x74, 0x65, 0x22, 0x3a, 0x20, 0x22, 0x32, 0x30, 0x32, 0x31, 0x2d, 0x31, 0x32, 0x2d, 0x31, 0x30, 0x54, 0x32, 0x30, 0x3a, 0x30, 0x30, 0x3a, 0x35, 0x35, 0x2e, 0x33, 0x32, 0x37, 0x33, 0x39, 0x36, 0x5a, 0x22, 0x2c, 0x20, 0x22, 0x76, 0x65, 0x72, 0x73, 0x69, 0x6f, 0x6e, 0x22, 0x3a, 0x20, 0x22, 0x35, 0x2e, 0x33, 0x22, 0x7d]),
    Uint8Array.from([0x7b, 0x7d]),
    Uint8Array.from([0x7b, 0x7d]),
    Uint8Array.from([0x7b, 0x7d]),
];
const i = 0;

var obtainedSignature = "ae0082fc60af1a1ce8e5738fbb629355a790c249c8522260383ef7841a07379e";
var scheme = "sha256";
var key = "5ab756dd-1f39eb7791f9173123a97ebb";
var hmac = crypto.createHmac(scheme, key);
hmac.update(messageFrames[i + 2]);
hmac.update(messageFrames[i + 3]);
hmac.update(messageFrames[i + 4]);
hmac.update(messageFrames[i + 5]);
var expectedSignature = hmac.digest("hex");
console.log("expectedSignature", expectedSignature);
console.log("obtainedSignature", obtainedSignature);
