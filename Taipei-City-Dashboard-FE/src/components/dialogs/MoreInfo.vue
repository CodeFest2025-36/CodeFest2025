<!-- Developed by Taipei Urban Intelligence Center 2023-2024-->

<script setup>
import DashboardComponent from "../../dashboardComponent/DashboardComponent.vue";
import { useDialogStore } from "../../store/dialogStore";
import { useContentStore } from "../../store/contentStore";
import { useAuthStore } from "../../store/authStore";

import DialogContainer from "./DialogContainer.vue";
import HistoryChart from "../charts/HistoryChart.vue";
import DownloadData from "./DownloadData.vue";
import EmbedComponent from "./EmbedComponent.vue";

const dialogStore = useDialogStore();
const contentStore = useContentStore();
const authStore = useAuthStore();

function getLinkTag(link, index) {
	if (link.includes("data.taipei")) {
		return `資料集 - ${index + 1} (data.taipei)`;
	} else if (link.includes("data.ntpc")) {
		return `資料集 - ${index + 1} (data.ntpc)`;
	} else if (link.includes("tuic.gov.taipei")) {
		return `大數據中心專案網頁`;
	} else if (link.includes("github.com")) {
		return `GitHub 程式庫`;
	} else {
		return `資料集 - ${index + 1} (其他)`;
	}
}
</script>

<template>
  <DialogContainer
    :dialog="`moreInfo`"
    @on-close="dialogStore.hideAllDialogs"
  >
    <div class="moreinfo">
      <DashboardComponent
        :config="dialogStore.moreInfoContent"
        :active-city="dialogStore.moreInfoContent.city"
        :city-tag="contentStore.cityManager.getTagList(dialogStore.moreInfoContent.city)"
        mode="large"
      />
      <div class="moreinfo-info">
        <div class="moreinfo-info-data">
          <h3>
            組件說明（{{
              ` ID: ${dialogStore.moreInfoContent.id}｜Index: ${dialogStore.moreInfoContent.index}｜City: ${dialogStore.moreInfoContent.city}`
            }}）
          </h3>
          <p>{{ dialogStore.moreInfoContent.long_desc }}</p>
          <h3>範例情境</h3>
          <p>{{ dialogStore.moreInfoContent.use_case }}</p>
          <div v-if="dialogStore.moreInfoContent.history_config">
            <h3>歷史軸</h3>
            <h4>*點擊並拉動以檢視細部區間資料</h4>
            <HistoryChart
              :chart_config="
                dialogStore.moreInfoContent.chart_config
              "
              :series="dialogStore.moreInfoContent.history_data"
              :history_config="
                dialogStore.moreInfoContent.history_config
              "
            />
          </div>
          <div v-if="dialogStore.moreInfoContent.links?.length > 0">
            <h3>相關資料</h3>
            <div class="moreinfo-info-links">
              <a
                v-for="(link, index) in dialogStore
                  .moreInfoContent.links"
                :key="link"
                :href="link"
                target="_blank"
                rel="noreferrer"
              >{{ getLinkTag(link, index) }}</a>
            </div>
          </div>
          <div v-if="dialogStore.moreInfoContent.contributors">
            <h3>協作者</h3>
            <div class="moreinfo-info-contributors">
              <div
                v-for="contributor in dialogStore
                  .moreInfoContent.contributors"
                :key="contributor"
              >
                <a
                  :href="
                    contentStore.contributors[contributor]
                      .link
                  "
                  target="_blank"
                  rel="noreferrer"
                ><img
                  :src="
                    contentStore.contributors[
                      contributor
                    ].image.includes('http')
                      ? contentStore.contributors[
                        contributor
                      ].image
                      : `/images/contributors/${contentStore.contributors[contributor].image}`
                  "
                  :alt="`協作者-${contentStore.contributors[contributor].user_name}`"
                >
                </a>
              </div>
            </div>
          </div>
        </div>
        <div class="moreinfo-info-control">
          <button
            v-if="authStore.token"
            @click="
              dialogStore.showReportIssue(
                dialogStore.moreInfoContent.id,
                dialogStore.moreInfoContent.index,
                dialogStore.moreInfoContent.name
              )
            "
          >
            <span>flag</span>回報
          </button>
          <button
            v-if="
              dialogStore.moreInfoContent.chart_config
                .types[0] !== 'MetroChart'
            "
            @click="dialogStore.showDialog('downloadData')"
          >
            <span>download</span>下載
          </button>
          <button @click="dialogStore.showDialog('embedComponent')">
            <span>code</span>內嵌
          </button>
        </div>
        <DownloadData />
        <EmbedComponent />
      </div>
    </div>
  </DialogContainer>
</template>

<style scoped lang="scss">
.moreinfo {
	height: fit-content;
	width: 400px;
	display: grid;

	@media (min-width: 820px) {
		width: 720px;
		height: 410px;
		grid-template-columns: 3fr 2fr;
	}

	@media (min-width: 1200px) {
		height: 440px;
		width: 820px;
	}

	@media (min-width: 2200px) {
		height: 550px;
		width: 920px;
	}

	&-info {
		display: flex;
		flex-direction: column;
		padding: var(--font-ms);
		border-top: solid 1px var(--color-border);

		p {
			margin-bottom: 0.75rem;
			color: var(--color-complement-text);
			text-align: justify;
		}

		h4 {
			color: var(--color-complement-text);
			font-weight: 400;
			font-size: 10px;
		}

		@media (min-width: 820px) {
			border-left: solid 1px var(--color-border);
			border-top: none;
		}

		&-data {
			max-height: calc(100% - 2.5rem);
			overflow-y: scroll;
			padding-right: 8px;

			&::-webkit-scrollbar {
				width: 4px;
			}
			&::-webkit-scrollbar-thumb {
				background-color: rgba(136, 135, 135, 0.5);
				border-radius: 4px;
			}
			&::-webkit-scrollbar-thumb:hover {
				background-color: rgba(136, 135, 135, 1);
			}
		}

		&-contributors {
			display: flex;
			flex-wrap: wrap;
			row-gap: 4px;
			column-gap: 4px;
			margin: 4px 0 var(--font-s);

			a {
				display: flex;
				align-items: center;

				p {
					margin: 0;
					transition: color 0.2s;
				}

				img {
					height: var(--font-xl);
					margin-right: 4px;
					border-radius: 50%;
				}

				&:hover p {
					color: var(--color-highlight);
				}
			}
		}

		&-links {
			display: grid;
			grid-template-columns: 1fr 1fr;
			margin: 0 0 var(--font-s);

			a {
				font-size: var(--font-s);
				color: var(--color-complement-text);
				transition: color 0.2s;

				&:hover {
					color: var(--color-highlight);
				}
			}
		}

		&-control {
			display: flex;
			align-items: flex-end;
			justify-content: flex-end;
			flex: 1;

			span {
				margin-right: 4px;
				font-family: var(--font-icon);
				font-size: var(--font-m);
			}

			button {
				display: flex;
				align-items: center;
				margin-left: 8px;
				padding: 2px 4px;
				border-radius: 5px;
				background-color: var(--color-highlight);
				font-size: var(--font-ms);
				transition: opacity 0.2s;

				&:hover {
					opacity: 0.8;
				}
			}
		}
	}
}
</style>
