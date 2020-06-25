var fs = require("fs");
const util = require("util");
const lineByLine = require("n-readlines");

const open = util.promisify(fs.open);
const read = util.promisify(fs.read);

const READ = "r";

class CSVFile {
  constructor(filename) {
    this.filename = filename;
    this.linesMap = [0];
    this.keys = [];

    this.initMap();
  }

  initMap() {
    const liner = new lineByLine(this.filename);
    let line;
    let counterChars = 0;

    while ((line = liner.next())) {
      counterChars += line.length + 1; // Concidering the \n char
      this.linesMap.push(counterChars);
    }
  }

  async getKeys() {
    const length = this.linesMap[1] - 1; // Avoid reading \n
    const buffer = Buffer.alloc(length);
    const fd = await open(this.filename, READ);

    const keysOffset = this.linesMap[0];
    const keys = await await read(fd, buffer, null, length, keysOffset);

    this.keys = keys.buffer.toString().split(",");
  }

  async get_line(line_num) {
    const lineOffset = this.linesMap[line_num];
    const length = this.linesMap[line_num + 1] ?
      this.linesMap[line_num + 1] - lineOffset - 1 :
      null;

    const buffer = Buffer.alloc(length);
    const fd = await open(this.filename, READ);

    let line = await read(fd, buffer, null, length, lineOffset);
    line = line.buffer.toString().split(",");

    if (!this.keys.length) {
      await this.getKeys(); // Memoize this.keys call
    }

    return this.buildMap(line);
  }

  buildMap(line) {
    const csvMap = {};

    for (let i = 0; i < line.length; i++) {
      csvMap[this.keys[i].trim()] = line[i].trim();
    }

    return csvMap;
  }

  async *get_iter(line_num) {
    while (this.linesMap[line_num + 1]) {
      yield await this.get_line(line_num + 1);
      line_num++;
    }
  }
}

const test = async (line_num) => {
  const csv = new CSVFile("./data/file.csv");
  await csv.get_line(line_num);

  const iter = csv.get_iter(2);

  iter.next().then(({
    value,
    done
  }) => {
    console.log(value);
  });
  iter.next().then(({
    value,
    done
  }) => {
    console.log(value);
  });
};

test(1);