const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer');
// import { createServer } from 'http';
const { MemoryCache } = require('cache-list');
const express = require('express');
const app = express();

const cache = new MemoryCache({
  defaultDuration: 600 // 10 min
});

const getData = async () => {
  const browser = await chromium.puppeteer.launch({
    executablePath: await chromium.executablePath
  });
  const page = await browser.newPage();
  await page.goto('https://tarifaluzhora.es/');
  const data = await listado(page);
  await browser.close();
  // return JSON.stringify(data);
  return data;
};

const listado = page => {
  return new Promise(async (resolve, reject) => {
    try {
      const listado = await page.evaluate(() => {
        const lista = [];
        const listado_tarifas = document.querySelectorAll(
          '#hour_prices > .col-xs-9'
        );
        listado_tarifas.forEach(tarifa => {
          const horario = tarifa
            .querySelector('span[itemprop="description"]')
            .innerText.substring(0, 9);
          const precio = tarifa.querySelector(
            'span[itemprop="price"]'
          ).innerText;
          const datos = {
            horario,
            precio
          };
          lista.push(datos);
        });

        const avg = document.querySelector(
          '.gauge_day > span:nth-child(2)'
        ).innerText;
        const avgFecha = document.querySelector(
          '.gauge_day > span:nth-child(3)'
        ).innerText;

        const minPrice = document.querySelector(
          '.gauge_low > span:nth-child(3)'
        ).innerText;

        const minHorario = document.querySelector(
          '.gauge_low > span:nth-child(2)'
        ).innerText;

        const maxPrice = document.querySelector(
          '.gauge_hight > span:nth-child(3)'
        ).innerText;

        const maxHorario = document.querySelector(
          '.gauge_low > span:nth-child(2)'
        ).innerText;

        const data = {
          avg: {
            horario: avgFecha,
            precio: `${avg.toString().trim()}/kWh`
          },
          min: {
            horario: minHorario,
            precio: minPrice.toString().trim()
          },
          max: {
            horario: maxHorario,
            precio: maxPrice.toString().trim()
          },
          listado: lista
        };
        return data;
      });
      resolve(listado);
    } catch (error) {
      reject(error);
    }
  });
};

const getDate = () => {
  const d = new Date();
  let date = d.toLocaleDateString('es-ES');
  date = date.split('/');
  date = `${date[0]} del ${date[1]} de ${date[2]}`;
  return date;
};

const checkExist = async () => {
  date = getDate();
  if (cache.get('date') === date) {
    return true;
  } else {
    cache.set('date', date);
    return false;
  }
};

app.get('/', (req, res) => {
  checkExist()
    .then(exist => {
      if (exist) {
        console.log(cache.get('data'));
        res.status(200).send(cache.get('data'));
      } else {
        console.info('No hay datos');
        getData()
          .then(data => {
            console.info(data);
            cache.set('data', data);
            res.status(200).json(data);
          })
          .catch(error => {
            res.status(500).end(JSON.stringify(error));
          });
      }
    })
    .catch(error => {
      res.status(500).end(JSON.stringify(error));
    });
});

app
  .listen(process.env.HTTPS_PORT || 3000, () => {
    console.info(`Escuchando en el puerto: ${process.env.HTTPS_PORT || 3000}`);
  })
  .on('error', err => {
    console.error(err);
  });

// Export the Express API
module.exports = app;
