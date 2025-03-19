const config = require('./config');
const os = require('os');

let metrics = [];

// http Metrics
let totalRequests = 0;
let deleteRequests = 0;
let getRequests = 0;
let postRequests = 0;
let putRequests = 0;

// system Metrics
let memoryUsage = 0;
let cpuUsage = 0;
let successfulAuth = 0;
let failedAuth = 0;
let requestLatency = 0;
let pizzaLatency = 0;

// stats Metrics
let activeUsers = 0;
let pizzasSold = 0;
let pizzaFails = 0;
let revenue = 0;

function httpMetrics() {
    totalRequests = deleteRequests + getRequests + postRequests + putRequests;
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

    addMetric('successfulAuth', successfulAuth, 'sum', '1');
    addMetric('failedAuth', failedAuth, 'sum', '1');

    // TODO: Latency calcs
    addMetric('requestLatency', requestLatency, 'histogram', 'ms');
    addMetric('pizzaLatency', pizzaLatency, 'histogram', 'ms');
}

function statsMetrics() {
    addMetric('activeUsers', activeUsers, 'sum', '1');
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
                },
            ],
        },
    };
    
    if (type === 'sum') {
    metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
    metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].isMonotonic = true;
    }
    metrics.push(metric);
}

function sendMetricsPeriodically(period) {
    const timer = setInterval(() => {
      try {
        httpMetrics();
        systemMetrics();
        statsMetrics();

        this.sendMetricToGrafana(metrics);
        metrics = [];
      } catch (error) {
        console.log('Error sending metrics', error);
      }
    }, period);
  }

function sendMetricToGrafana(metricName, metricValue, type, unit) {
  const metric = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics: [
              {
                name: metricName,
                unit: unit,
                [type]: {
                  dataPoints: [
                    {
                      asInt: metricValue,
                      timeUnixNano: Date.now() * 1000000,
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  };

  if (type === 'sum') {
    metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
    metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].isMonotonic = true;
  }

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
        console.log(`Pushed ${metricName}`);
      }
    })
    .catch((error) => {
      console.error('Error pushing metrics:', error);
    });
}