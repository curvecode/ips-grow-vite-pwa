<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const interestRates = ref([])
const lastUpdated = ref(null)
const lastCrawledAt = ref(null)
const dataSource = ref('-')
const workerError = ref('')
const isLoading = ref(true)
const hoveredBankLabel = ref('')
const hoveredLegendBankName = ref('')
const pinnedLegendBankName = ref('')
const selectedTermMonths = ref(12)
const currentDatasetTermMonths = ref(12)
const selectedSourceKey = ref('thebank')
const currentDatasetSourceKey = ref('thebank')
const legendPlacement = ref('right')
let dataWorker = null

const sourceOptions = [
  { value: 'thebank', label: 'thebank.vn' },
  { value: 'laodong', label: 'laodong.vn' },
  { value: 'techcombank', label: 'techcombank.com' },
]

function colorForBank(index, alpha = 1) {
  const hue = Math.round((index * 137.508) % 360)
  return `hsl(${hue} 85% 62% / ${alpha})`
}

const hasRenderableData = computed(() =>
  interestRates.value.some((bank) => Array.isArray(bank.rates_12_months) && bank.rates_12_months.length > 0),
)

const highlightedBankName = computed(() => hoveredLegendBankName.value || pinnedLegendBankName.value)

function areRatesEqual(currentData, incomingData) {
  if (currentData.length !== incomingData.length) {
    return false
  }

  for (let bankIndex = 0; bankIndex < currentData.length; bankIndex += 1) {
    const currentBank = currentData[bankIndex]
    const incomingBank = incomingData[bankIndex]

    if (!incomingBank || currentBank.bank_name !== incomingBank.bank_name) {
      return false
    }

    if (currentBank.rates_12_months.length !== incomingBank.rates_12_months.length) {
      return false
    }

    for (let rateIndex = 0; rateIndex < currentBank.rates_12_months.length; rateIndex += 1) {
      const currentRate = currentBank.rates_12_months[rateIndex]
      const incomingRate = incomingBank.rates_12_months[rateIndex]

      if (!incomingRate) {
        return false
      }

      if (currentRate.month !== incomingRate.month || currentRate.rate !== incomingRate.rate) {
        return false
      }
    }
  }

  return true
}

const chartData = computed(() => {
  const labels = interestRates.value[0]?.rates_12_months.map((item) => item.month) ?? []

  return {
    labels,
    datasets: interestRates.value.map((bank, index) => {
      const isHighlighted = highlightedBankName.value
        ? bank.bank_name === highlightedBankName.value
        : false

      return {
        label: bank.bank_name,
        data: bank.rates_12_months.map((item) => item.rate),
        borderColor: colorForBank(index, highlightedBankName.value && !isHighlighted ? 0.25 : 1),
        backgroundColor: 'transparent',
        tension: 0.3,
        borderWidth: isHighlighted ? 4 : 2,
        borderDash: index % 2 === 0 ? [] : [6, 4],
        pointRadius: isHighlighted ? 4 : 2,
        pointHoverRadius: 6,
        pointHoverBorderWidth: 2,
        order: isHighlighted ? 0 : 1,
        hidden: false,
        clip: 8,
        segment: {
          borderColor: colorForBank(index, highlightedBankName.value && !isHighlighted ? 0.25 : 1),
        },
      }
    }),
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'dataset',
    intersect: false,
  },
  onHover: (_, activeElements, chart) => {
    if (!activeElements.length) {
      hoveredBankLabel.value = ''
      return
    }

    const datasetIndex = activeElements[0].datasetIndex
    hoveredBankLabel.value = chart?.data?.datasets?.[datasetIndex]?.label ?? ''
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      mode: 'dataset',
      intersect: false,
    },
    title: {
      display: true,
      text: `Lãi suất kỳ hạn ${selectedTermMonths.value} tháng`,
      color: '#f8fafc',
    },
  },
  scales: {
    x: {
      ticks: { color: '#94a3b8' },
      grid: { color: 'rgba(148, 163, 184, 0.15)' },
    },
    y: {
      ticks: { color: '#94a3b8' },
      grid: { color: 'rgba(148, 163, 184, 0.15)' },
      title: {
        display: true,
        text: '%',
        color: '#cbd5e1',
      },
    },
  },
}))

function applySelectedOptions() {
  if (!dataWorker) {
    return
  }

  isLoading.value = true
  hoveredBankLabel.value = ''
  hoveredLegendBankName.value = ''
  pinnedLegendBankName.value = ''
  dataWorker.postMessage({
    type: 'set-options',
    termMonths: selectedTermMonths.value,
    sourceKey: selectedSourceKey.value,
  })
}

function latestRateOf(bank) {
  const latest = bank?.rates_12_months?.at(-1)?.rate
  return typeof latest === 'number' ? `${latest.toFixed(2)}%` : '-'
}

function onLegendHover(bankName) {
  hoveredLegendBankName.value = bankName
}

function onLegendLeave() {
  hoveredLegendBankName.value = ''
}

function onLegendClick(bankName) {
  pinnedLegendBankName.value = pinnedLegendBankName.value === bankName ? '' : bankName
}

const stats = computed(() => {
  if (interestRates.value.length === 0) {
    return {
      bankCount: 0,
      latestMonth: '-',
      highestRate: '-',
      averageRate: '-',
    }
  }

  const latestMonth = interestRates.value[0].rates_12_months.at(-1)?.month ?? '-'
  const latestRates = interestRates.value
    .map((bank) => ({
      bank_name: bank.bank_name,
      rate: bank.rates_12_months.at(-1)?.rate,
    }))
    .filter((item) => typeof item.rate === 'number')

  const highest = latestRates.reduce((best, current) => {
    if (!best || current.rate > best.rate) {
      return current
    }
    return best
  }, null)

  const average = latestRates.length
    ? latestRates.reduce((sum, item) => sum + item.rate, 0) / latestRates.length
    : null

  return {
    bankCount: interestRates.value.length,
    latestMonth,
    highestRate: highest ? `${highest.bank_name} (${highest.rate.toFixed(2)}%)` : '-',
    averageRate: average !== null ? `${average.toFixed(2)}%` : '-',
  }
})

onMounted(() => {
  dataWorker = new Worker(new URL('./workers/dataWorker.js', import.meta.url), { type: 'module' })

  dataWorker.onmessage = (event) => {
    if (event.data?.type === 'loading') {
      isLoading.value = Boolean(event.data.value)
      return
    }

    if (event.data?.type === 'error') {
      workerError.value = event.data.message
      isLoading.value = false
      return
    }

    if (event.data?.type === 'interest-rates' && Array.isArray(event.data.payload)) {
      const incomingTerm = event.data.termMonths === 6 ? 6 : 12
      const incomingSource = ['thebank', 'laodong', 'techcombank'].includes(event.data.sourceKey)
        ? event.data.sourceKey
        : 'thebank'
      const hasTermChanged = currentDatasetTermMonths.value !== incomingTerm
      const hasSourceChanged = currentDatasetSourceKey.value !== incomingSource
      const hasChanged = !areRatesEqual(interestRates.value, event.data.payload)

      if (hasChanged || hasTermChanged || hasSourceChanged) {
        interestRates.value = event.data.payload
      }

      if (pinnedLegendBankName.value && !event.data.payload.some((bank) => bank.bank_name === pinnedLegendBankName.value)) {
        pinnedLegendBankName.value = ''
      }

      currentDatasetTermMonths.value = incomingTerm
      currentDatasetSourceKey.value = incomingSource

      if (event.data.dataSource) {
        dataSource.value = event.data.dataSource
      }

      if (event.data.lastCrawlAt) {
        lastCrawledAt.value = event.data.lastCrawlAt
      }

      workerError.value = ''
      lastUpdated.value = event.data.fetchedAt ?? Date.now()
      isLoading.value = false
    }
  }

  applySelectedOptions()
  dataWorker.postMessage('start')
})

onBeforeUnmount(() => {
  if (!dataWorker) {
    return
  }

  dataWorker.postMessage('stop')
  dataWorker.terminate()
  dataWorker = null
})
</script>

<template>
  <main class="min-h-screen bg-slate-950 text-slate-100">
    <div class="mx-auto max-w-8xl px-6 py-8">
      <header class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold">Bank Interest Tracker</h1>
          <p class="text-sm text-slate-400">Cập nhật tự động mỗi 5 phút từ Web Worker</p>
        </div>
        <div class="flex items-center gap-4">
          <label class="flex items-center gap-2 text-xs text-slate-300">
            Nguồn
            <select
              v-model="selectedSourceKey"
              class="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
              @change="applySelectedOptions"
            >
              <option v-for="source in sourceOptions" :key="source.value" :value="source.value">{{ source.label }}</option>
            </select>
          </label>
          <label class="flex items-center gap-2 text-xs text-slate-300">
            Kỳ hạn
            <select
              v-model.number="selectedTermMonths"
              class="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
              @change="applySelectedOptions"
            >
              <option :value="6">6 tháng</option>
              <option :value="12">12 tháng</option>
            </select>
          </label>
          <p class="text-xs text-slate-400">
            Cập nhật gần nhất:
            <span class="text-slate-200">{{ lastUpdated ? new Date(lastUpdated).toLocaleString() : '-' }}</span>
          </p>
        </div>
      </header>

      <section class="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div class="rounded-xl border border-slate-800 bg-slate-900 p-4 lg:col-span-9">
          <div class="mb-3 flex items-center justify-between gap-4 text-xs text-slate-300">
            <div>
              Đang hover: <span class="font-medium text-slate-100">{{ hoveredBankLabel || '-' }}</span>
            </div>
            <label class="flex items-center gap-2">
              Chú thích
              <select
                v-model="legendPlacement"
                class="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
              >
                <option value="left">Trái</option>
                <option value="right">Phải</option>
              </select>
            </label>
          </div>
          <div
            class="flex h-[520px] gap-4"
            :class="legendPlacement === 'left' ? 'flex-row-reverse' : 'flex-row'"
          >
            <div class="w-44 shrink-0 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <p class="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Chú thích ngân hàng</p>
              <ul class="space-y-2">
                <li
                  v-for="(bank, index) in interestRates"
                  :key="bank.bank_name"
                  class="flex items-center gap-2 cursor-pointer rounded-md px-1.5 py-1 text-xs transition"
                  :class="[
                    (hoveredLegendBankName === bank.bank_name || pinnedLegendBankName === bank.bank_name)
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-200 hover:bg-slate-800/70',
                  ]"
                  @mouseenter="onLegendHover(bank.bank_name)"
                  @mouseleave="onLegendLeave"
                  @click="onLegendClick(bank.bank_name)"
                >
                  <span
                    class="h-2.5 w-2.5 shrink-0 rounded-full"
                    :style="{ backgroundColor: colorForBank(index) }"
                  ></span>
                  <span class="min-w-0 truncate" :title="`${bank.bank_name} - ${latestRateOf(bank)}`">
                    {{ bank.bank_name }} - {{ latestRateOf(bank) }}
                  </span>
                </li>
              </ul>
            </div>
            <div class="relative min-w-0 flex-1">
            <div
              v-if="isLoading || !hasRenderableData"
              class="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-slate-900/90"
            >
              <div class="h-8 w-8 animate-spin rounded-full border-2 border-slate-500 border-t-sky-400"></div>
              <p class="mt-3 text-sm text-slate-300">
                {{ isLoading ? 'Đang tải dữ liệu biểu đồ...' : 'Đang chờ dữ liệu để hiển thị biểu đồ...' }}
              </p>
            </div>
            <Line v-if="hasRenderableData" :data="chartData" :options="chartOptions" />
            </div>
          </div>
          <p v-if="workerError" class="mt-3 text-sm text-rose-400">Lỗi cập nhật dữ liệu: {{ workerError }}</p>
        </div>

        <aside class="rounded-xl border border-slate-800 bg-slate-900 p-4 lg:col-span-3">
          <h2 class="mb-3 text-sm font-medium uppercase tracking-wide text-slate-300">Thống kê nhanh</h2>
          <div class="overflow-hidden rounded-lg border border-slate-800">
            <table class="w-full text-left text-sm">
              <tbody>
                <tr class="border-b border-slate-800">
                  <th class="bg-slate-950/70 px-3 py-2 font-medium text-slate-300">Số ngân hàng</th>
                  <td class="px-3 py-2">{{ stats.bankCount }}</td>
                </tr>
                <tr class="border-b border-slate-800">
                  <th class="bg-slate-950/70 px-3 py-2 font-medium text-slate-300">Tháng mới nhất</th>
                  <td class="px-3 py-2">{{ stats.latestMonth }}</td>
                </tr>
                <tr class="border-b border-slate-800">
                  <th class="bg-slate-950/70 px-3 py-2 font-medium text-slate-300">Kỳ hạn đang xem</th>
                  <td class="px-3 py-2">{{ currentDatasetTermMonths }} tháng</td>
                </tr>
                <tr class="border-b border-slate-800">
                  <th class="bg-slate-950/70 px-3 py-2 font-medium text-slate-300">Nguồn đang xem</th>
                  <td class="px-3 py-2">{{ currentDatasetSourceKey }}</td>
                </tr>
                <tr class="border-b border-slate-800">
                  <th class="bg-slate-950/70 px-3 py-2 font-medium text-slate-300">Lãi suất cao nhất</th>
                  <td class="px-3 py-2">{{ stats.highestRate }}</td>
                </tr>
                <tr class="border-b border-slate-800">
                  <th class="bg-slate-950/70 px-3 py-2 font-medium text-slate-300">Thời điểm crawl gần nhất</th>
                  <td class="px-3 py-2">{{ lastCrawledAt ? new Date(lastCrawledAt).toLocaleString() : '-' }}</td>
                </tr>
                <tr class="border-b border-slate-800">
                  <th class="bg-slate-950/70 px-3 py-2 font-medium text-slate-300">Nguồn dữ liệu</th>
                  <td class="px-3 py-2">{{ dataSource }}</td>
                </tr>
                <tr>
                  <th class="bg-slate-950/70 px-3 py-2 font-medium text-slate-300">Trung bình hiện tại</th>
                  <td class="px-3 py-2">{{ stats.averageRate }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </aside>
      </section>
    </div>
  </main>
</template>
