const config = require('./config');
const os = require('os');

let currentMetrics = [];

// http Metrics
let totalRequests = 0;
let deleteRequests = 0;
let getRequests = 0;
let postRequests = 0;
let putRequests = 0;

// system Metrics
let memoryUsage = 0;
let cpuUsage = 0;

// stats Metrics
let successfulAuth = 0;
let failedAuth = 0;
let totalReqLatency
let requestLat = 0;
let totalPizzaLatency = 0;
let pizzaLat = 0;
let numPizzaReq = 0;
let activeUsers = 0;
let pizzasSold = 0;
let pizzaFails = 0;
let revenue = 0;

function httpMetrics() {
    addMetric('totalRequests', totalRequests, 'sum', '1');
    addMetric('getRequests', getRequests, 'sum', '1');
    addMetric('postRequests', postRequests, 'sum', '1');
    addMetric('putRequests', putRequests, 'sum', '1');
    addMetric('deleteRequests', deleteRequests, 'sum', '1');
}

function systemMetrics() {
    memoryUsage = getMemoryUsagePercentage();
    cpuUsage = getCpuUsagePercentage();
    addMetric('memoryUsage', memoryUsage, 'gauge', '%');
    addMetric('cpuUsage', cpuUsage, 'gauge', '%');
}

function statsMetrics() {
    addMetric('activeUsers', activeUsers, 'sum', '1');
    addMetric('successfulAuth', successfulAuth, 'sum', '1');
    addMetric('failedAuth', failedAuth, 'sum', '1');

    // TODO: Latency calcs
    requestLat = (totalReqLatency / totalRequests);
    requestLat.toFixed(0);
    addMetric('requestLatency', requestLat, 'histogram', 'ms');
    pizzaLat = (totalPizzaLatency / numPizzaReq);
    pizzaLat.toFixed(0);
    addMetric('pizzaLatency', pizzaLat, 'histogram', 'ms');
    
    addMetric('pizzasSold', pizzasSold, 'sum', '1');
    addMetric('pizzaFails', pizzaFails, 'sum', '1');
    addMetric('revenue', revenue, 'sum', '1');
}

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

function addMetric(metricName, metricValue, type, unit) {
    const metric = {
        name: metricName,
        unit: unit,
        [type]: {
            dataPoints: [
                {
                    asInt: metricValue,
                    timeUnixNano: Date.now() * 1000000,
                    attributes: [
                        {
                            key: "source",
                            value: { "stringValue": "jwt-pizza-service" }
                        }
                    ]
                },
            ],
        },
    };
    
    if (type === 'sum') {
    metric[type].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
    metric[type].isMonotonic = true;
    }
    currentMetrics.push(metric);
}

function sendMetricsPeriodically(period) {
    const timer = setInterval(() => {
      try {
        httpMetrics();
        systemMetrics();
        statsMetrics();

        sendMetricsToGrafana();
        currentMetrics = [];
      } catch (error) {
        console.log(timer);
        console.log('Error sending metrics', error);
      }
    }, period);
  }

function sendMetricsToGrafana() {
    const stringMetrics = JSON.stringify(currentMetrics);
  const metric = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics: stringMetrics
          },
        ],
      },
    ],
  };

  const body = JSON.stringify(metric);
  fetch(`${config.url}`, {
    method: 'POST',
    body: body,
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
  })
    .then((response) => {
      if (!response.ok) {
        response.text().then((text) => {
          console.error(`Failed to push metrics data to Grafana: ${text}\n${body}`);
        });
      } else {
        console.log(`Pushed metrics`);
      }
    })
    .catch((error) => {
      console.error('Error pushing metrics:', error);
    });
}

async function requestTracker(req, res, next) {
    const start = Date.now();
    totalRequests++;
    switch(req.method) {
        case 'GET':
            getRequests++;
            break;
        case 'POST':
            postRequests++;
            break;
        case 'PUT':
            putRequests++;
            break;
        case 'DELETE':
            deleteRequests++;
            break;
    }

    res.on('finish', () => {
        const end = Date.now();
        const duration = end - start;
        totalReqLatency += duration;
    });

    next();
}

async function activeUserTracker(req, res, next) {
    switch(req.method) {
        case 'PUT':
            activeUsers++;
            res.on('finish', () => {
                successfulAuth++;
            });
        
            res.on('error', () => {
                failedAuth++;
            });
            break;
        case 'DELETE':
            activeUsers--;
            break;
    }

    next();
}

async function pizzaLatencyTracker(req, res, next) {
    const start = Date.now();
    numPizzaReq++;

    res.on('finish', () => {
        const end = Date.now();
        const duration = end - start;
        totalPizzaLatency += duration;

        const orderItems = res.body.order.items;
        pizzasSold += orderItems.length;

        let orderRevenue = 0;
        orderItems.forEach(item => {
            orderRevenue += item.price;
        });
        revenue += orderRevenue;
    });
    res.on('error', () => {
        pizzaFails++;
    });

    next();
};

sendMetricsPeriodically(60000);

module.exports = {requestTracker, activeUserTracker, pizzaLatencyTracker};