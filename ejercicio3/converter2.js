class Currency {
    constructor(code, name) {
        this.code = code;
        this.name = name;
    }
}

class CurrencyConverter {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.currencies = [];
    }

    async getCurrencies() {
        try {
            const response = await fetch(`${this.apiUrl}/currencies`);
            const data = await response.json();
            this.currencies = Object.entries(data).map(
                ([code, name]) => new Currency(code, name)
            );
        } catch (error) {
            console.error('Error fetching currencies:', error);
        }
    }

    async convertCurrency(amount, fromCurrency, toCurrency, date = null) {
        if (fromCurrency.code === toCurrency.code) {
            return amount;
        }

        const endpoint = date 
            ? `${this.apiUrl}/${date}?amount=${amount}&from=${fromCurrency.code}&to=${toCurrency.code}`
            : `${this.apiUrl}/latest?amount=${amount}&from=${fromCurrency.code}&to=${toCurrency.code}`;

        try {
            const response = await fetch(endpoint);
            const data = await response.json();
            return data.rates[toCurrency.code];
        } catch (error) {
            console.error('Error converting currency:', error);
            return null;
        }
    }

    async getRateOnDate(date, fromCurrency, toCurrency) {
        if (fromCurrency.code === toCurrency.code) {
            return 1;
        }

        try {
            const response = await fetch(`${this.apiUrl}/${date}?from=${fromCurrency.code}&to=${toCurrency.code}`);
            const data = await response.json();
            return data.rates[toCurrency.code];
        } catch (error) {
            console.error(`Error fetching rate for ${date}:`, error);
            return null;
        }
    }

    async getRateDifference(fromCurrency, toCurrency) {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        const rateToday = await this.getRateOnDate(today, fromCurrency, toCurrency);
        const rateYesterday = await this.getRateOnDate(yesterday, fromCurrency, toCurrency);

        if (rateToday !== null && rateYesterday !== null) {
            return rateToday - rateYesterday;
        } else {
            return null;
        }
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("conversion-form");
    const resultDiv = document.getElementById("result");
    const fromCurrencySelect = document.getElementById("from-currency");
    const toCurrencySelect = document.getElementById("to-currency");
    const conversionDateInput = document.getElementById("conversion-date");

    const converter = new CurrencyConverter("https://api.frankfurter.app");

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    conversionDateInput.value = today;

    await converter.getCurrencies();
    populateCurrencies(fromCurrencySelect, converter.currencies);
    populateCurrencies(toCurrencySelect, converter.currencies);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const amount = parseFloat(document.getElementById("amount").value);
        const fromCurrency = converter.currencies.find(
            (currency) => currency.code === fromCurrencySelect.value
        );
        const toCurrency = converter.currencies.find(
            (currency) => currency.code === toCurrencySelect.value
        );
        const date = conversionDateInput.value;

        const convertedAmount = await converter.convertCurrency(
            amount,
            fromCurrency,
            toCurrency,
            date
        );

        if (convertedAmount !== null && !isNaN(convertedAmount)) {
            resultDiv.textContent = `${amount} ${fromCurrency.code} son ${convertedAmount.toFixed(2)} ${toCurrency.code}`;
        } else {
            resultDiv.textContent = "Error al realizar la conversión.";
        }

        const rateDifference = await converter.getRateDifference(fromCurrency, toCurrency);
        if (rateDifference !== null) {
            const diffElement = document.createElement("p");
            diffElement.textContent = `La diferencia en la tasa de cambio entre hoy y ayer es: ${rateDifference.toFixed(4)} ${toCurrency.code}`;
            resultDiv.appendChild(diffElement);
        } else {
            const diffElement = document.createElement("p");
            diffElement.textContent = "Error al calcular la diferencia en la tasa de cambio.";
            resultDiv.appendChild(diffElement);
        }
    });

    function populateCurrencies(selectElement, currencies) {
        if (currencies) {
            currencies.forEach((currency) => {
                const option = document.createElement("option");
                option.value = currency.code;
                option.textContent = `${currency.code} - ${currency.name}`;
                selectElement.appendChild(option);
            });
        }
    }
});
