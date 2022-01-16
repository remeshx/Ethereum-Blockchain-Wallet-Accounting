const fs = require('fs');

class LoggerService {

    constructor() {
        this.fileStream = [];
	this.path = require('path').dirname(require.main.filename);
    }

    async log(file, line, data) {
        var datetime = new Date();
        if (data) line = line + ' ,' + JSON.stringify(data);
        try {
            await this.fileStream[file].write(datetime.toISOString() + ': ' + line + "\n");
        } catch (error) {
	    const filepath = this.path + '/logs/' + file + '.log';
	    console.log('filepath',filepath);
            this.fileStream[file] = fs.createWriteStream(filepath, { flags: 'a' });
            await this.fileStream[file].write(datetime.toISOString() + ': ' + line + "\n");
        }
    }

    async deposit(line, data = null) {
        this.log('deposits', line, data);
    }

    async withdraw(line, data = null) {
        this.log('withdraws', line, data);
    }

    async error(line, data = null) {
        this.log('errors', line, data);
    }

    async info(line, data = null) {
        this.log('info', line, data);
    }

    async blocks(line, data = null) {
        this.log('blocks', line, data);
    }

}

const logger = new LoggerService();
module.exports = logger
