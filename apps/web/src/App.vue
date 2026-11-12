<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import type { Session } from "@supabase/supabase-js";
import { authClient, localMode } from "./auth";
import TaskDashboard from "./TaskDashboard.vue";

const session = ref<Session | null>(null);
const loading = ref(Boolean(authClient));
const saving = ref(false);
const email = ref("");
const password = ref("");
const error = ref("");
let unsubscribe: (() => void) | undefined;

function sessionExpired() {
  session.value = null;
  error.value = "Sua sessão expirou. Entre novamente.";
}

onMounted(() => {
  window.addEventListener("taskdesk:unauthorized", sessionExpired);
  if (!authClient) return;
  const { data } = authClient.auth.onAuthStateChange((_event, nextSession) => {
    session.value = nextSession;
    loading.value = false;
  });
  unsubscribe = () => data.subscription.unsubscribe();
});
onUnmounted(() => {
  unsubscribe?.();
  window.removeEventListener("taskdesk:unauthorized", sessionExpired);
});

async function signIn() {
  if (!authClient || saving.value) return;
  saving.value = true;
  error.value = "";
  try {
    const result = await authClient.auth.signInWithPassword({email: email.value.trim(), password: password.value});
    if (result.error) throw result.error;
    session.value = result.data.session;
    password.value = "";
  } catch {
    error.value = "Não foi possível entrar. Confira seus dados e tente novamente.";
  } finally {
    saving.value = false;
  }
}

async function signOut() {
  if (!authClient || saving.value) return;
  saving.value = true;
  error.value = "";
  try {
    const result = await authClient.auth.signOut({scope: "local"});
    if (result.error) throw result.error;
    session.value = null;
    password.value = "";
  } catch {
    error.value = "Não foi possível sair. Tente novamente.";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <template v-if="localMode || session">
    <div v-if="session" class="account-bar">
      <span>Conta conectada</span>
      <span v-if="error" role="alert">{{ error }}</span>
      <button class="secondary-button" :disabled="saving" @click="signOut">Sair</button>
    </div>
    <TaskDashboard :key="session?.user.id ?? 'local'" />
  </template>
  <main v-else class="auth-shell">
    <section class="auth-card" aria-labelledby="auth-title">
      <p class="eyebrow">SEU ESPAÇO DE TRABALHO</p>
      <h1 id="auth-title">taskDesk</h1>
      <p v-if="loading" role="status">Verificando sua sessão...</p>
      <template v-else-if="!authClient">
        <h2>Acesso indisponível</h2>
        <p>Estamos preparando seu espaço. Tente novamente mais tarde.</p>
      </template>
      <form v-else @submit.prevent="signIn">
        <p>Entre para acessar suas tarefas.</p>
        <p v-if="error" class="feedback feedback-error" role="alert">{{ error }}</p>
        <label class="field-label" for="login-email">E-mail</label>
        <input id="login-email" v-model="email" type="email" autocomplete="username" required :disabled="saving" />
        <label class="field-label" for="login-password">Senha</label>
        <input id="login-password" v-model="password" type="password" autocomplete="current-password" required :disabled="saving" />
        <button class="primary-button" type="submit" :disabled="saving">{{ saving ? "Entrando..." : "Entrar" }}</button>
      </form>
    </section>
  </main>
</template>
