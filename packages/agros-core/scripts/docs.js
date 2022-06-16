const path = require('path');
const deploy = require('aliyun-oss-deploy');

deploy(path.resolve(__dirname, '../docs-dist'), {
    accessKeyId: process.env.ACCESS_KEY_ID,
    accessKeySecret: process.env.ACCESS_KEY_SECRET,
    region: 'oss-ap-northeast-1',
    bucket: 'pugio',
});
