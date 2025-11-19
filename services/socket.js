let io = null;

module.exports = {
  setIo(newIo) {
    io = newIo;
  },
  getIo() {
    return io;
  }
};
