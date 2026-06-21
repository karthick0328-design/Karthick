const Layer = require('./node_modules/router/lib/layer');
const layer = new Layer('/', {}, () => { });
console.log('Layer has match:', typeof layer.match);
console.log('Layer has includes:', typeof layer.includes);
