import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './assets/scss/reset.scss'
import App from './App'
import Playground from './Playground'

const container = document.getElementById('app') as HTMLElement
const root = ReactDOM.createRoot(container)
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/playground" element={<Playground />} />
      <Route path="*" element={<App />} />
    </Routes>
  </BrowserRouter>
)
