<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import type { Session } from "@supabase/supabase-js";
import { authClient, localMode, neonMode, registrationEnabled, neonSignIn, neonSignOut, neonRegister, neonRestore, clearNeonSession } from "./auth";
import TaskDashboard from "./TaskDashboard.vue";

const session = ref<Session | null>(null);
const loading = ref(Boolean(authClient) || neonMode);
const neonUser = ref<{id:string;email:string}|null>(null);
const registering = ref(false);
const saving = ref(false);
const email = ref("");
const password = ref("");
const error = ref("");
let unsubscribe: (() => void) | undefined;
const restoreFailed = ref(false);
let restoring = false;
let restoreVersion = 0;
let disposed = false;

async function restoreSession() {
  if (restoring || disposed) return;
  restoring = true;
  const version = ++restoreVersion;
  loading.value = true;
  restoreFailed.value = false;
  try {
    const user = await neonRestore();
    if (!disposed && version === restoreVersion) neonUser.value = user;
  } catch {
    if (!disposed && version === restoreVersion) restoreFailed.value = true;
  } finally {
    restoring = false;
    if (!disposed && version === restoreVersion) loading.value = false;
  }
}

function connectionRestored() {
  if (restoreFailed.value) void restoreSession();
}

function sessionExpired() {
  restoreVersion++;
  restoreFailed.value = false;
  loading.value = false;
  session.value = null;
  neonUser.value = null;
  if (neonMode) clearNeonSession();
  error.value = "Sua sessão expirou. Entre novamente.";
}

onMounted(() => {
  if (neonMode) {
    void restoreSession();
    window.addEventListener("online", connectionRestored);
  }
  window.addEventListener("taskdesk:unauthorized", sessionExpired);
  if (neonMode || !authClient) return;
  const { data } = authClient.auth.onAuthStateChange((_event, nextSession) => {
    session.value = nextSession;
    loading.value = false;
  });
  unsubscribe = () => data.subscription.unsubscribe();
});
onUnmounted(() => {
  disposed = true;
  restoreVersion++;
  window.removeEventListener("online", connectionRestored);
  unsubscribe?.();
  window.removeEventListener("taskdesk:unauthorized", sessionExpired);
});

async function signIn() {
  if ((!authClient && !neonMode) || saving.value) return;
  saving.value = true;
  error.value = "";
  try {
    if (neonMode) {
      if(registering.value) { await neonRegister(email.value.trim(),password.value); registering.value=false; }
      neonUser.value=await neonSignIn(email.value.trim(),password.value);
    } else {
      const result = await authClient!.auth.signInWithPassword({email: email.value.trim(), password: password.value});
      if (result.error) throw result.error;
      session.value = result.data.session;
    }
    password.value = "";
  } catch {
    error.value = "Não foi possível entrar. Confira seus dados e tente novamente.";
  } finally {
    saving.value = false;
  }
}

async function signOut() {
  if ((!authClient && !neonMode) || saving.value) return;
  saving.value = true;
  error.value = "";
  try {
    if (neonMode) {
      neonUser.value=null;
      password.value="";
      await neonSignOut();
    }
    else {
      const result = await authClient!.auth.signOut({scope: "local"});
      if (result.error) throw result.error;
      session.value = null;
    }
    password.value = "";
  } catch {
    error.value = neonMode
      ? "Você saiu deste dispositivo. Não foi possível confirmar o encerramento da sessão no servidor."
      : "Não foi possível sair. Tente novamente.";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <template v-if="localMode || session || neonUser">
    <div v-if="session || neonUser" class="account-bar">
      <span>Conta conectada</span>
      <span v-if="error" role="alert">{{ error }}</span>
      <button class="secondary-button" :disabled="saving" @click="signOut">Sair</button>
    </div>
    <TaskDashboard :key="neonUser?.id ?? session?.user.id ?? 'local'" />
  </template>
  <main v-else class="auth-shell">
    <section class="auth-card" aria-labelledby="auth-title">
      <p class="eyebrow">SEU ESPAÇO DE TRABALHO</p>
      <h1 id="auth-title">taskDesk</h1>
      <p v-if="loading" role="status">Verificando sua sessão...</p>
      <template v-else-if="restoreFailed">
        <p class="feedback feedback-error" role="alert">Não foi possível verificar sua sessão. Seus dados de acesso foram preservados. Tente novamente quando a conexão estiver disponível.</p>
        <button class="primary-button" type="button" data-testid="retry-session" @click="restoreSession">Tentar novamente</button>
      </template>
      <template v-else-if="!authClient && !neonMode">
        <h2>Acesso indisponível</h2>
        <p>Estamos preparando seu espaço. Tente novamente mais tarde.</p>
      </template>
      <form v-else @submit.prevent="signIn">
        <p>{{ registering ? "Crie sua conta para começar." : "Entre para acessar suas tarefas." }}</p>
        <p v-if="error" class="feedback feedback-error" role="alert">{{ error }}</p>
        <label class="field-label" for="login-email">E-mail</label>
        <input id="login-email" v-model="email" type="email" autocomplete="username" required :disabled="saving" />
        <label class="field-label" for="login-password">Senha</label>
        <input id="login-password" v-model="password" type="password" autocomplete="current-password" required :disabled="saving" />
        <button class="primary-button" type="submit" :disabled="saving">{{ saving ? "Aguarde..." : registering ? "Cadastrar e entrar" : "Entrar" }}
        </button>
        <button v-if="registrationEnabled" class="secondary-button" type="button" :disabled="saving" @click="registering = !registering">{{ registering ? "Já tenho conta" : "Criar conta" }}</button>
      </form>
    </section>
  </main>
</template>
