<!-- Developed by Taipei Urban Intelligence Center 2023-2024-->

<!-- Navigation will be hidden from the navbar in mobile mode and moved to the settingsbar -->

<script setup>
const { VITE_APP_TITLE } = import.meta.env;
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useFullscreen } from "@vueuse/core";
import { useAuthStore } from "../../../store/authStore";
import { useDialogStore } from "../../../store/dialogStore";
import http from "../../../router/axios";

import UserSettings from "../../dialogs/UserSettings.vue";
import ContributorsList from "../../dialogs/ContributorsList.vue";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const dialogStore = useDialogStore();
const { isFullscreen, toggle } = useFullscreen();

const isSearchVisible = ref(false);
const searchQuery = ref('');
const isLoading = ref(false);

const linkQuery = computed(() => {
	const { query } = route;
	const indexQuery = `?index=${query.index}`;
	const cityQuery = query.city ? `&city=${query.city}` : '';
	return `${indexQuery}${cityQuery}`;
});

const handleSearch = async () => {
  if (searchQuery.value.trim()) {
    try {
      isLoading.value = true;
      
      // 1. 獲取所有儀表板列表
      const dashboardResponse = await http.get('dashboard/');
      const { taipei, metrotaipei } = dashboardResponse.data.data;
      
      // 2. 合併所有需要查詢的 index
      const allIndexes = [
        ...taipei.map(d => ({ index: d.index, city: 'taipei' })),
        ...metrotaipei.map(d => ({ index: d.index, city: 'metrotaipei' }))
      ];
      
      // 3. 對每個 index 發送請求並收集結果
      const searchResults = [];
      for (const { index, city } of allIndexes) {
        try {
          const response = await http.get(`/dashboard/${index}`);
          const components = response.data.data;
          
          // 4. 搜尋符合條件的組件
          const matchingComponents = components.filter(component => 
            component.name.toLowerCase().includes(searchQuery.value.trim().toLowerCase())
          );
          
          if (matchingComponents.length > 0) {
            searchResults.push({
              index,
              city,
              components: matchingComponents
            });
          }
        } catch (error) {
          console.error(`Error fetching dashboard ${index}:`, error);
        }
      }
      
      // 5. 如果找到結果，導航到第一個匹配的儀表板
      if (searchResults.length > 0) {
        const firstResult = searchResults[0];
        router.push({
          path: '/dashboard',
          query: { 
            index: firstResult.index,
            city: firstResult.city
          }
        });
      } else {
        dialogStore.showNotification('info', '未找到符合的儀表板');
      }
      
      searchQuery.value = '';
      isSearchVisible.value = false;
    } catch (error) {
      console.error('Search failed:', error);
      dialogStore.showNotification('fail', '搜尋失敗，請稍後再試');
    } finally {
      isLoading.value = false;
    }
  }
};

const toggleSearch = () => {
  isSearchVisible.value = !isSearchVisible.value;
  if (!isSearchVisible.value) {
    searchQuery.value = '';
  }
};
</script>

<template>
  <div class="navbar">
    <a href="/">
      <div class="navbar-logo">
        <div class="navbar-logo-image">
          <img
            src="../../../assets/images/TUIC.svg"
            alt="tuic logo"
          >
        </div>
        <div>
          <h1>{{ VITE_APP_TITLE }}</h1>
          <h2>Taipei City Dashboard</h2>
        </div>
      </div>
    </a>
    <div
      v-if="
        authStore.currentPath !== 'admin' &&
          !(authStore.isMobileDevice && authStore.isNarrowDevice)
      "
      class="navbar-tabs"
    >
      <router-link
        v-if="authStore.token"
        :to="`/component`"
        :class="{
          'router-link-active':
            authStore.currentPath.includes('component'),
        }"
      >
        組件瀏覽平台
      </router-link>
      <router-link
        :to="`/dashboard${
          linkQuery.includes('undefined') ? '' : linkQuery
        }`"
      >
        儀表板總覽
      </router-link>
      <router-link
        :to="`/mapview${
          linkQuery.includes('undefined') ? '' : linkQuery
        }`"
      >
        地圖交叉比對
      </router-link>
    </div>

    <div class="navbar-user">

      <div class="navbar-search">
        <button
          class="search-button"
          @click="toggleSearch"
        >
          <span>search</span>
        </button>
      </div>
	  
	  <div v-if="isSearchVisible" class="search-input-container">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜尋儀表板..."
            @keyup.enter="handleSearch"
            @blur="isSearchVisible = false"
            ref="searchInput"
          />
          <div v-if="isLoading" class="search-loading">
            <span>loading</span>
          </div>
        </div>

      <button
        v-if="!(authStore.isMobileDevice && authStore.isNarrowDevice)"
        class="hide-if-mobile"
        @click="toggle"
      >
        <span>{{
          isFullscreen ? "fullscreen_exit" : "fullscreen"
        }}</span>
      </button>
      
	  <div class="navbar-user-info">
        <button><span>info</span></button>
        <ul>
          <li>
            <a
              href="https://tuic.gov.taipei/documentation"
              target="_blank"
              rel="noreferrer"
            >技術文件</a>
          </li>
          <li>
            <button
              @click="dialogStore.showDialog('contributorsList')"
            >
              專案貢獻者
            </button>
          </li>
        </ul>
        <teleport to="body">
          <ContributorsList />
        </teleport>
      </div>
      <div
        v-if="
          authStore.token &&
            !(authStore.isMobileDevice && authStore.isNarrowDevice)
        "
        class="navbar-user-user"
      >
        <button>
          {{ authStore.user.name }}
        </button>
        <ul>
          <li>
            <button @click="dialogStore.showDialog('userSettings')">
              用戶設定
            </button>
          </li>
          <li
            v-if="
              authStore.currentPath !== 'admin' &&
                authStore.user.is_admin
            "
            class="hide-if-mobile"
          >
            <router-link to="/admin">
              管理員後臺
            </router-link>
          </li>
          <li
            v-else-if="authStore.user.is_admin"
            class="hide-if-mobile"
          >
            <router-link to="/dashboard">
              返回儀表板
            </router-link>
          </li>
          <li>
            <button @click="authStore.handleLogout">
              登出
            </button>
          </li>
        </ul>
        <teleport to="body">
          <user-settings />
        </teleport>
      </div>
      <div
        v-else-if="
          !(authStore.isMobileDevice && authStore.isNarrowDevice)
        "
        class="navbar-user-user"
      >
        <button @click="dialogStore.showDialog('login')">
          登入
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.navbar {
	height: 60px;
	width: 100vw;
	display: flex;
	justify-content: space-between;
	align-items: center;
	border-bottom: 1px solid var(--color-border);
	background-color: var(--color-component-background);
	user-select: none;

	&-logo {
		display: flex;

		h1 {
			font-weight: 500;
		}

		h2 {
			font-size: var(--font-s);
			font-weight: 400;
		}

		&-image {
			width: 22.94px;
			height: 45px;
			margin: 0 var(--font-m);

			img {
				height: 45px;
				filter: invert(1);
			}
		}
	}

	&-tabs {
		display: flex;

		a {
			height: 59px;
			display: flex;
			align-items: center;
			margin-left: var(--font-s);
			transition: opacity 0.2s, border-bottom 0.2s;
			border-bottom: solid 3px transparent;

			&:hover {
				opacity: 0.8;
			}
		}

		.router-link-active {
			border-bottom: solid 3px var(--color-highlight);
			color: var(--color-highlight);

			&:hover {
				opacity: 1;
			}
		}

		@media screen and (max-width: 750px) {
			display: none;
		}
		@media screen and (max-height: 500px) {
			display: none;
		}
	}

	&-user {
		display: flex;
		align-items: center;

		.navbar-search {
			position: relative;
			margin-right: var(--font-m);

			.search-button {
				display: flex;
				align-items: center;
				padding: 2px 4px;
				border-radius: 4px;
				transition: background-color 0.25s;

				&:hover {
					background-color: var(--color-complement-text);
				}

				span {
					font-family: var(--font-icon);
					font-size: calc(var(--font-l) * var(--font-to-icon));
				}
			}

			.search-input-container {
				position: absolute;
				right: 0;
				top: 100%;
				margin-top: 8px;
				z-index: 100;

				input {
					width: 250px;
					padding: 8px 12px;
					border: 1px solid var(--color-border);
					border-radius: 4px;
					background-color: var(--color-component-background);
					color: var(--color-text);
					font-size: var(--font-m);

					&:focus {
						outline: none;
						border-color: var(--color-highlight);
					}
				}

				.search-loading {
					position: absolute;
					right: 12px;
					top: 50%;
					transform: translateY(-50%);
					
					span {
						font-family: var(--font-icon);
						font-size: calc(var(--font-m) * var(--font-to-icon));
						animation: spin 1s linear infinite;
					}
				}
			}
		}

		li a,
		button {
			display: flex;
			align-items: center;
			margin-right: var(--font-m);
			padding: 2px 4px;
			border-radius: 4px;
			font-size: var(--font-m);
			transition: background-color 0.25s;
		}

		span {
			font-family: var(--font-icon);
			font-size: calc(var(--font-l) * var(--font-to-icon));
		}

		&-user:hover ul,
		&-info:hover ul {
			display: block;
			opacity: 1;
		}

		&-user,
		&-info {
			height: 60px;
			min-width: 100px;
			display: flex;
			align-items: center;
			justify-content: center;

			@media screen and (max-width: 750px) {
				display: none;
			}
			@media screen and (max-height: 500px) {
				display: none;
			}

			ul {
				min-width: 100px;
				display: none;
				position: absolute;
				right: 20px;
				top: 55px;
				padding: 8px;
				border-radius: 5px;
				background-color: rgb(85, 85, 85);
				opacity: 0;
				transition: opacity 0.25s;
				z-index: 10;

				li {
					border-radius: 5px;
					transition: background-color 0.25s;

					a,
					button {
						padding: 8px 6px;
						width: 100%;
						height: 100%;
					}
				}

				li:hover {
					background-color: var(--color-complement-text);
				}
			}
		}

		&-info {
			min-width: 0;

			ul {
				right: 120px;
				top: 55px;
			}

			@media screen and (max-width: 750px) {
				display: flex;

				ul {
					right: 20px;
					top: 55px;
				}
			}
			@media screen and (max-height: 500px) {
				display: flex;
			}
		}
	}
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}
</style>



