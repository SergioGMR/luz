import puppeteer from 'puppeteer';
import { createServer } from 'http';
import { MemoryCache } from 'cache-list';

const cache = new MemoryCache({
  defaultDuration: 600 // 10 min
});

const getData = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://tarifaluzhora.es/');
  const data = await listado(page);
  await browser.close();
  return JSON.stringify(data);
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

const checkExist = () => {
  const date = getDate();
  if (cache.get('date') === date) {
    return true;
  }
  getData()
    .then(data => {
      cache.set('date', date);
      cache.set('data', data);
    })
    .catch(error => {
      console.log(error);
    })
    .then(() => {
      return false;
    });
};

const server = createServer((req, res) => {
  if (checkExist()) {
    res.writeHead(200, {
      'Content-Type': 'application/json'
    });
    res.end(cache.get('data'));
    return;
  }
  getData()
    .then(data => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    })
    .catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(err));
    });
});

// run de server
(async () =>
  server.listen(process.env.HTTPS_PORT || 3000, () => {
    console.log(`server running on port ${process.env.HTTPS_PORT || 3000}`);
  }))();
