// Convert a hex string to decimal array
var hexToDecArray = function (hexString) {
  const size = 2;
  const length = Math.ceil(hexString.length / size);
  const decimalList = new Array(length);

  for (let i = 0, o = 0; i < length; ++i, o += size) {
    decimalList[i] = parseInt(hexString.substr(o, size), 16);
  }

  return decimalList;
};
