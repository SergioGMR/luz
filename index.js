import puppeteer from 'puppeteer';
import { createServer } from 'http';
import { readFileSync, writeFileSync, stat } from 'fs';

const getData = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://tarifaluzhora.es/');
  await browser.close();
  return await listado(page);
  // JSON.stringify(listado_tarifas);
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
  return d.split('T')[0];
};

const checkExist = async () => {
  const exist = stat(`./data/${getDate()}.json`, (err, stats) => {
    if (err) {
      return false;
    }
    return true;
  });
  if (exist) {
    console.log('ya existe');
    console.log(`./data/${getDate()}.json`);
    return JSON.stringify(readFileSync(`./data/${getDate()}.json`));
  } else {
    return JSON.stringify(getData());
  }
};

createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end();
}).listen(process.env.HTTPS_PORT || 3000);
