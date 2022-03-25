import puppeteer from 'puppeteer';
import { createServer } from 'http';
let listado_tarifas;

const getData = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://tarifaluzhora.es/');
  listado_tarifas = await listado(page);
  await browser.close();
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

createServer((req, res) => {
  getData();
  console.log(listado_tarifas)
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(listado_tarifas));
}).listen(process.env.HTTPS_PORT || 3000);
