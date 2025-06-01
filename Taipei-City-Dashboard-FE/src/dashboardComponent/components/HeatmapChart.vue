<!-- Developed by Taipei Urban Intelligence Center 2023-2024-->

<script setup>
import { computed, ref } from "vue";
import VueApexCharts from "vue3-apexcharts";

const props = defineProps([
	"chart_config",
	"activeChart",
	"series",
	"map_config",
	"map_filter",
	"map_filter_on",
]);

const emits = defineEmits([
	"filterByParam",
	"filterByLayer",
	"clearByParamFilter",
	"clearByLayerFilter",
	"fly"
]);

// 大數據集檢測
const isLargeDataSet = computed(() => {
	return props.chart_config.categories && props.chart_config.categories.length > 12
})

// 計算初始寬度
const initialWidth = computed(() => {
	const WIDTH_PER_ITEM = 32  // 熱力圖格子寬度，調整為32像素
	const itemCount = props.chart_config.categories ? props.chart_config.categories.length : 10;
	return itemCount * WIDTH_PER_ITEM;
});

const widthValue = ref(initialWidth.value);

// 計算初始高度 - 新增
const initialHeight = computed(() => {
	const HEIGHT_PER_ITEM = 32  // 熱力圖格子高度，設定為32像素
	const seriesCount = props.series ? props.series.length : 5;
	return seriesCount * HEIGHT_PER_ITEM + 100; // 加100px給軸標籤等空間
});

const heightValue = ref(initialHeight.value);

// 轉換為帶單位的字串供 ApexCharts 使用
const chartWidth = computed(() => {
	return isLargeDataSet.value ? `${widthValue.value}px` : "100%";
});

// 新增高度計算
const chartHeight = computed(() => {
	return `${heightValue.value}px`;
});

const heatmapData = computed(() => {
	let output = {};
	let highest = 0;
	let sum = 0;
	if (props.series.length === 1) {
		props.series[0].data.forEach((item) => {
			output[item.x] = item.y;
			if (item.y > highest) {
				highest = item.y;
			}
			sum += item.y;
		});
	} else {
		props.series.forEach((serie) => {
			for (let i = 0; i < props.chart_config.categories.length; i++) {
				if (!output[props.chart_config.categories[i]]) {
					output[props.chart_config.categories[i]] = 0;
				}
				output[props.chart_config.categories[i]] += +serie.data[i];

				if (+serie.data[i] > highest) highest = +serie.data[i];
			}
		});
		sum = Object.values(output).reduce(
			(partialSum, a) => partialSum + a,
			0
		);
	}

	output.highest = highest;
	output.sum = sum;
	return output;
});

const colorScale = computed(() => {
	// 固定使用0~25範圍，切分為配置顏色的數量，由淺到深
	const FIXED_MAX = 25;
	const COLOR_SEGMENTS = props.chart_config.color ? props.chart_config.color.length : 5;
	const SEGMENT_SIZE = FIXED_MAX / COLOR_SEGMENTS; // 每段的數值範圍
	
	const ranges = props.chart_config.color ? props.chart_config.color.map(
		(color, index) => ({
			to: Math.floor(SEGMENT_SIZE * (index + 1)),
			from: Math.floor(SEGMENT_SIZE * index) + 1,
			color: color,
		})
	) : [];
	
	// 為25以上的數值添加最深的顏色
	if (props.chart_config.color && props.chart_config.color.length > 0) {
		ranges.push({
			to: 9999, // 設定一個很大的數值作為上限
			from: 26,
			color: props.chart_config.color[props.chart_config.color.length - 1], // 使用配置中最後一個（最深的）顏色
		});
	}
	
	// 數值為0使用透明/淺灰色（無顏色）
	ranges.unshift({
		to: 0,
		from: 0,
		color: "rgba(200, 200, 200, 0.2)", // 淺灰色透明
	});
	
	return ranges;
});

const chartOptions = ref({
	chart: {
		stacked: true,
		zoom: {
			allowMouseWheelZoom: false,
		},
		toolbar: isLargeDataSet.value 
			? {
				show: true,
				tools: {
					download: false,
					pan: false,
					reset: "<p>" + "重置" + "</p>",
					zoomin: false,
					zoomout: false,
				}
			  }
			: {
				show: false,
			}
	},
	dataLabels: {
		distributed: true,
		style: {
			fontSize: "12px",
			fontWeight: "normal",
		},
	},
	grid: {
		show: false,
	},
	legend: {
		show: false,
	},
	markers: {
		size: 3,
		strokeWidth: 0,
	},
	plotOptions: {
		heatmap: {
			enableShades: false,
			radius: 4,
			colorScale: {
				ranges: colorScale.value,
			},
		},
	},
	stroke: {
		show: true,
		width: 2,
		colors: ["#282a2c"],
	},
	tooltip: {
		custom: function ({
			series,
			seriesIndex,
			dataPointIndex,
			w,
		}) {
			// The class "chart-tooltip" could be edited in /assets/styles/chartStyles.css
			return (
				'<div class="chart-tooltip">' +
				"<h6>" +
				`${w.globals.labels[dataPointIndex]}-${w.globals.seriesNames[seriesIndex]}` +
				"</h6>" +
				"<span>" +
				`${series[seriesIndex][dataPointIndex]}` +
				`${props.chart_config.unit}` +
				"</span>" +
				"</div>"
			);
		},
	},
	xaxis: {
		axisBorder: {
			show: false,
		},
		axisTicks: {
			show: false,
		},
		categories: props.chart_config.categories
			? props.chart_config.categories
			: [],
		labels: {
			offsetY: 5,
			formatter: function (value) {
				return value.length > 7 ? value.slice(0, 6) + "..." : value;
			},
		},
		tooltip: {
			enabled: false,
		},
		type: "category",
	},
	yaxis: {
		max: function (max) {
			// 如果數據最高值超過25，則使用實際最高值，否則使用25
			return Math.max(25, heatmapData.value.highest);
		},
	},
});

const selectedIndex = ref(null);

function handleDataSelection(_e, _chartContext, config) {
	if (!props.map_filter || !props.map_filter_on) {
		return;
	}
	if (
		`${config.dataPointIndex}-${config.seriesIndex}` !== selectedIndex.value
	) {
		// Supports filtering by xAxis + yAxis
		if (props.map_filter.mode === "byParam") {
			emits(
				"filterByParam",
				props.map_filter,
				props.map_config,
				config.w.globals.labels[config.dataPointIndex],
				config.w.globals.seriesNames[config.seriesIndex]
			);
		}
		// Supports filtering by xAxis
		else if (props.map_filter.mode === "byLayer") {
			emits(
				"filterByLayer",
				props.map_config,
				config.w.globals.labels[config.dataPointIndex]
			);
		}
		selectedIndex.value = `${config.dataPointIndex}-${config.seriesIndex}`;
	} else {
		if (props.map_filter.mode === "byParam") {
			emits("clearByParamFilter", props.map_config);
		} else if (props.map_filter.mode === "byLayer") {
			emits("clearByLayerFilter", props.map_config);
		}
		selectedIndex.value = null;
	}
}

// 尺寸控制函數
function increaseWidth() {
	widthValue.value += 100;
	heightValue.value += 80; // 同時調整高度
}

function decreaseWidth() {
	if (widthValue.value > 200) {
		widthValue.value -= 100;
		heightValue.value -= 80; // 同時調整高度
	}
}

function resetWidth() {
	widthValue.value = initialWidth.value;
	heightValue.value = initialHeight.value; // 重置高度
}
</script>

<template>
  <div
    v-if="activeChart === 'HeatmapChart'"
    class="heatmapchart"
  >
    <div class="heatmapchart-title">
      <h5>總合</h5>
      <h6>{{ heatmapData.sum }} {{ chart_config.unit }}</h6>
    </div>
    <div
      v-if="isLargeDataSet"
      class="heatmapchart-toolbar"
    >
      <p
        class="heatmapchart-toolbar-item"
        @click="increaseWidth"
      >
        <span>add</span>
      </p>
      <p
        class="heatmapchart-toolbar-item"
        @click="decreaseWidth"
      >
        <span>remove</span>
      </p>
      <p
        class="heatmapchart-toolbar-item reset"
        @click="resetWidth"
      >
        重置
      </p>
    </div>
    <VueApexCharts
      :key="chartWidth"
      :width="chartWidth"
      :height="chartHeight"
      type="heatmap"
      :options="chartOptions"
      :series="series"
      @data-point-selection="handleDataSelection"
    />
  </div>
</template>

<style scoped lang="scss">
.heatmapchart {
	overflow: auto;
	position: relative;
	height: 100%;

	.vue-apexcharts {
		justify-content: unset !important;
	}

	&-title {
		display: flex;
		justify-content: center;
		flex-direction: column;
		margin: -0.2rem 0 -1.5rem;

		h5 {
			margin: 0;
			color: var(--color-complement-text);
		}

		h6 {
			margin: 0;
			color: var(--color-complement-text);
			font-size: var(--font-m);
			font-weight: 400;
		}
	}

	&-toolbar {
		position: sticky;
		top: 0;
		left: 0;
		z-index: 1;
		background-color: var(--color-component-background);
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 4px;
		margin-bottom: 8px;

		&-item {
			cursor: pointer;
			font-size: var(--font-s);
			display: flex;
			justify-content: center;
			align-items: center;

			span {
				text-align: center;
				font-family: var(--font-icon);
				font-size: var(--font-ms);
				padding: 2px;
			}

			&.reset {
				color: var(--color-highlight)
			}
		}
	}
}
</style>
