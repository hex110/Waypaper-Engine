import { Routes, Route } from 'react-router-dom'
import Home from './routes/Home'
import SwwwConfig from './routes/SwwwConfig'
import AppConfig from './routes/AppConfiguration'
import MonitorsConfig from './routes/MonitorsConfig'
import Drawer from './components/Drawer'
import { ImagesProvider } from './hooks/imagesStore'
import { HashRouter } from 'react-router-dom'

const App = () => {
  return (
    <HashRouter>
      <Drawer>
        <ImagesProvider>
          <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/swwwConfig' element={<SwwwConfig />} />
            <Route path='/appConfig' element={<AppConfig />} />
            <Route path='/monitorsConfig' element={<MonitorsConfig />} />
          </Routes>
        </ImagesProvider>
      </Drawer>
    </HashRouter>
  )
}

export default App
