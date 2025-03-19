const config = require('./config');
const os = require('os');

let totalRequests = 0;
let deleteRequests = 0;
let getRequests = 0;
let postRequests = 0;
let putRequests = 0;

let activeUsers = 0;

let successfulAuth = 0;
let failedAuth = 0;

let totalMem = 0;
let currentMem = 0;
let freeMem = 0;
let cpuUsage = 0;

let pizzasSold = 0;
let pizzaFails = 0;
let revenue = 0;

let requestLatency = 0;
let pizzaLatency = 0;

setInterval(() => {
  const cpuValue = Math.floor(Math.random() * 100) + 1;
  sendMetricToGrafana('cpu', cpuValue, 'gauge', '%');

  requests += Math.floor(Math.random() * 200) + 1;
  sendMetricToGrafana('requests', requests, 'sum', '1');

  latency += Math.floor(Math.random() * 200) + 1;
  sendMetricToGrafana('latency', latency, 'sum', 'ms');
}, 1000);

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