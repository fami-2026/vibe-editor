<template>
    <div class="topLeftActions">
        <div class="docCard">
            <p class="label">Документ</p>
            <p class="docId">ID: {{ documentId }}</p>
            <p class="status" :class="isOfflineMode ? 'offline' : 'online'">
                {{
                    isOfflineMode ? 'Офлайн-режим' : 'Синхронизация с сервером'
                }}
            </p>
            <p v-if="serverError" class="errorText">{{ serverError }}</p>
        </div>

        <form class="openForm" @submit.prevent="openById">
            <label class="label" for="doc-id-input">Открыть по ID</label>
            <div class="openRow">
                <input
                    id="doc-id-input"
                    v-model.trim="openId"
                    class="idInput"
                    type="text"
                    placeholder="Введите id"
                />
                <button class="secondaryBtn" type="submit" :disabled="!openId">
                    Открыть
                </button>
            </div>
        </form>

        <button class="primaryBtn" type="button" @click="openImportDialog">
            Импорт JSON
        </button>
        <input
            ref="fileInput"
            class="hiddenInput"
            type="file"
            accept="application/json,.json"
            @change="handleFileChange"
        />
        <ExportDropdown />
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import ExportDropdown from './ExportDropdown.vue';
import { useCanvasStore } from '@/stores/canvas';

const canvasStore = useCanvasStore();
const { documentId, isOfflineMode, serverError } = storeToRefs(canvasStore);
const fileInput = ref<HTMLInputElement | null>(null);
const openId = ref('');

function openImportDialog() {
    fileInput.value?.click();
}

async function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    try {
        const content = await file.text();
        const result = canvasStore.importFromJson(content);

        if (!result.success) {
            window.alert(result.message);
        }
    } catch (error) {
        console.error('Ошибка чтения файла импорта:', error);
        window.alert('Не удалось прочитать выбранный файл.');
    } finally {
        input.value = '';
    }
}

async function openById() {
    if (!openId.value) return;
    const result = await canvasStore.openDocumentById(openId.value);
    if (!result.success) {
        window.alert(result.message);
        return;
    }
    window.alert(result.message);
    openId.value = '';
}
</script>

<style scoped>
.topLeftActions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 250px;
}

.docCard {
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 10px;
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
}

.label {
    font-size: 12px;
    color: #475569;
    margin: 0 0 2px;
}

.docId {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
    word-break: break-all;
}

.status {
    margin: 6px 0 0;
    font-size: 12px;
    font-weight: 600;
}

.status.online {
    color: #166534;
}

.status.offline {
    color: #b45309;
}

.errorText {
    margin: 6px 0 0;
    font-size: 12px;
    color: #b91c1c;
}

.openForm {
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.openRow {
    display: grid;
    gap: 6px;
    grid-template-columns: 1fr auto;
}

.idInput {
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 14px;
}

.primaryBtn {
    background: #2563eb;
    color: #ffffff;
    border: 0;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
}

.secondaryBtn {
    background: #0f172a;
    color: #fff;
    border: 0;
    border-radius: 8px;
    padding: 8px 10px;
    cursor: pointer;
}

.secondaryBtn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.primaryBtn:hover {
    background: #1d4ed8;
}

.hiddenInput {
    display: none;
}
</style>
