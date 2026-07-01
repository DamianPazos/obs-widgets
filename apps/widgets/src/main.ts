import { mount } from 'svelte';
import App from './App.svelte';
import './styles/global.css';

const target = document.getElementById('app');
if (!target) throw new Error('No se encontró el contenedor #app');

export default mount(App, { target });
