<template>
    <div class="topLeftActions">
        <button
            class="primaryBtn"
            type="button"
            @click="openImportDialog"
        >
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
import ExportDropdown from './ExportDropdown.vue';
import { useCanvasStore } from '@/stores/canvas';

const canvasStore = useCanvasStore();
const fileInput = ref<HTMLInputElement | null>(null);

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
</script>

<style scoped>
.topLeftActions {
    display: flex;
    flex-direction: column;
    gap: 8px;
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

.primaryBtn:hover {
    background: #1d4ed8;
}

.hiddenInput {
    display: none;
}
</style>
