if (process.env.NODE_ENV !== 'production') { require('dotenv').config() }
const http = require('http')
const WebSocket = require('ws')

const hostname = process.env.SUBDOMAIN + '.' + process.env.DOMAIN || 'localhost'
const port = process.env.PORT || 3001

const server = http.createServer()

const wss = new WebSocket.Server({ server }) 

wss.on('connection', (ws) => {
    ws.subscriptions = {trades: [], quotes: []}
    // ws.send('{"T":"q","S":"TSLA","bx":"V","bp":903.02,"bs":5,"ax":"V","ap":925.88,"as":3,"c":["R"],"z":"C","t":"2022-08-04T19:59:57.945111522Z"}')
    // ws.send('{"T":"t","S":"TSLA","i":13294,"x":"V","p":925.8,"s":1500,"c":["@","I"],"z":"C","t":"2022-08-04T19:59:58.201767423Z"}')
    ws.on('message', (data, isBinary) => {
        let message = isBinary ? data : JSON.parse(data)
        if (message.action === 'subscribe') {
            if (message.trades?.includes('*')) {
                ws.subscriptions.trades = ['*']
            } else {
                message.trades?.map(symbol => {
                    if (ws.subscriptions.trades.indexOf(symbol) === -1) {
                        ws.subscriptions.trades.push(symbol)
                    }
                })
            }
            if (message.quotes?.includes('*')) {
                ws.subscriptions.quotes = ['*']
            } else {
                message.quotes?.map(symbol => {
                    if (ws.subscriptions.quotes.indexOf(symbol) === -1) {
                        ws.subscriptions.quotes.push(symbol)
                    }
                })
            }
        } else if (message.action === 'unsubscribe') {
            if (message.trades?.includes('*')) {
                ws.subscriptions.trades = []
            } else {
                message.trades?.map(symbol => {
                    let index = ws.subscriptions.trades.indexOf(symbol)
                    if (index !== -1) {
                        ws.subscriptions.trades.splice(index, 1)
                    } 
                })
            }
            if (message.quotes?.includes('*')) {
                ws.subscriptions.quotes = []
            } else {
                message.quotes?.map(symbol => {
                    let index = ws.subscriptions.quotes.indexOf(symbol)
                    if (index !== -1) {
                        ws.subscriptions.quotes.splice(index, 1)
                    } 
                })
            }
        }
    })
})
.on('error', (err) => {
    console.log(err)
})

const alpaca = new WebSocket('wss://stream.data.alpaca.markets/v2/iex')

alpaca.on('open', () => {
    alpaca.send(JSON.stringify({'action': 'auth', 'key': `${process.env.ALPACA_KEY}`, 'secret': `${process.env.ALPACA_SECRET}`}))
    alpaca.send(JSON.stringify({'action': 'subscribe', 'trades': ['AAPL', 'TSLA', 'MSFT'], 'quotes': ['AAPL', 'TSLA', 'MSFT']}))
})
.on('message', (data, isBinary) => {
    let message = isBinary ? data : JSON.parse(data)
    Array.from(wss.clients).map(ws => {
        message.map(m => {
            if (m.T === 't') {
                if (ws.subscriptions.trades[0] === '*' || ws.subscriptions.trades?.includes(m.S)) {
                    ws.send(JSON.stringify(m))
                }
            } else if (m.T === 'q') {
                if (ws.subscriptions.quotes[0] === '*' || ws.subscriptions.quotes?.includes(m.S)) {
                    ws.send(JSON.stringify(m))
                }
            }
        })
    })
})
.on('close', () => {
    console.log(`Alpaca Closed. ${Date.getTime().toLocaleString()}`)
})
.on('error', (err) => {
    console.log(err)
})


server.listen(port, (err) => {
    if (err) {
        console.log(err)
    } else {
        console.log(`Server running at wss://${hostname}:${port}/`)
    }
})