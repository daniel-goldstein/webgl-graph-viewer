import express from 'express';
import path from 'path';

const __dirname = path.resolve();

const app = express();

app.use(express.static('public'));
app.use('/node_modules', express.static(`${__dirname}/node_modules`));
app.get('/', (_, res) => res.sendFile('/public/index.html', { root: __dirname }));
app.listen(3000);
