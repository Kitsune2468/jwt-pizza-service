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
let memoryUsage = 0.0;
let cpuUsage = 0.0;

// stats Metrics
let successfulAuth = 0;
let failedAuth = 0;
let totalReqLatency = 0;
let requestLat = 0.0;
let totalPizzaLatency = 0;
let pizzaLat = 0.0;
let numPizzaReq = 0;
let activeUsers = 0;
let pizzasSold = 0;
let pizzaFails = 0;
let revenue = 0.0;

function httpMetrics() {
    addIntMetric('totalRequests', totalRequests, 'sum', '1');
    addIntMetric('getRequests', getRequests, 'sum', '1');
    addIntMetric('postRequests', postRequests, 'sum', '1');
    addIntMetric('putRequests', putRequests, 'sum', '1');
    addIntMetric('deleteRequests', deleteRequests, 'sum', '1');
}

function systemMetrics() {
    memoryUsage = getMemoryUsagePercentage();
    cpuUsage = getCpuUsagePercentage();
    addDoubleMetric('memoryUsage', memoryUsage, 'gauge', '%');
    addDoubleMetric('cpuUsage', cpuUsage, 'gauge', '%');
}

function statsMetrics() {
    addIntMetric('activeUsers', activeUsers, 'sum', '1');
    addIntMetric('successfulAuth', successfulAuth, 'sum', '1');
    addIntMetric('failedAuth', failedAuth, 'sum', '1');

    // TODO: Latency calcs
    if(totalRequests == 0) {
        requestLat = (totalReqLatency / totalRequests);
        requestLat = Math.floor(requestLat) * 100;
    } else {
        requestLat = 0;
    }
    addIntMetric('requestLatency', requestLat, 'sum', 'ms');
    if(totalRequests == 0) {
        pizzaLat = (totalPizzaLatency / numPizzaReq);
        pizzaLat = Math.floor(pizzaLat) * 100;
    } else {
        pizzaLat = 0;
    }
    addIntMetric('pizzaLatency', pizzaLat, 'sum', 'ms');
    
    addIntMetric('pizzasSold', pizzasSold, 'sum', '1');
    addIntMetric('pizzaFails', pizzaFails, 'sum', '1');
    addDoubleMetric('revenue', revenue, 'sum', '1');
}

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory);
  return memoryUsage.toFixed(2) * 100;
}

function addIntMetric(metricName, metricValue, type, unit) {
    const metric = {
        name: metricName,
        unit: unit,
        description: "",
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

function addDoubleMetric(metricName, metricValue, type, unit) {
    const metric = {
        name: metricName,
        unit: unit,
        description: "",
        [type]: {
            dataPoints: [
                {
                    asDouble: metricValue,
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

function resetMetrics() {
    currentMetrics = [];

    // http Metrics
    totalRequests = 0;
    deleteRequests = 0;
    getRequests = 0;
    postRequests = 0;
    putRequests = 0;

    // system Metrics
    memoryUsage = 0.0;
    cpuUsage = 0.0;

    // stats Metrics
    successfulAuth = 0;
    failedAuth = 0;
    totalReqLatency
    requestLat = 0.0;
    totalPizzaLatency = 0;
    pizzaLat = 0.0;
    numPizzaReq = 0;
    activeUsers = 0;
    pizzasSold = 0;
    pizzaFails = 0;
    revenue = 0.0;
}

function sendMetricsPeriodically(period) {
    const timer = setInterval(() => {
      try {
        httpMetrics();
        systemMetrics();
        statsMetrics();

        sendMetricsToGrafana();
        resetMetrics();
      } catch (error) {
        console.log(timer);
        console.log('Error sending metrics', error);
      }
    }, period);
  }

function sendMetricsToGrafana() {
    //const stringMetrics = JSON.stringify(currentMetrics);
    const metric = {
        resourceMetrics: [
            {
            scopeMetrics: [
                {
                metrics: currentMetrics
                },
            ],
            },
        ],
    };

  const body = JSON.stringify(metric);
  fetch(`${config.metrics.url}`, {
    method: 'POST',
    body: body,
    headers: { Authorization: `Bearer ${config.metrics.apiKey}`, 'Content-Type': 'application/json' },
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

    const send = res.send;

    res.on('finish', () => {
        console.log("Start Hit requestTracker finish");
        const end = Date.now();
        const duration = end - start;
        totalReqLatency += duration;
        console.log("End Hit finish requestTracker totalReqLatency = "+ totalReqLatency);
    });

    next();
}

// async function activeUserTracker(req, res, next) {
//     switch(req.method) {
//         case 'PUT':
//             activeUsers++;
//             res.on('finish', () => {
//                 console.log("DEBUG: Hit successfulAuth");
//                 successfulAuth++;
//             });
        
//             res.on('error', () => {
//                 console.log("DEBUG: Hit failedAuth");
//                 failedAuth++;
//             });
//             break;
//         case 'DELETE':
//             activeUsers--;
//             break;
//     }
//     console.log("DEBUG: Hit active user tracker");

//     next();
// }

function addActiveUser() {
    activeUsers++;
}
function removeActiveUser() {
    activeUsers--;
}

function addRevenue(income) {
    revenue += income;
}

function addSuccessfulAuth() {
    successfulAuth++;
}
function addFailedAuth() {
    failedAuth++;
}

sendMetricsPeriodically(60000);

module.exports = {
    requestTracker, 
    addActiveUser, 
    removeActiveUser, 
    addRevenue, 
    addSuccessfulAuth, 
    addFailedAuth
};