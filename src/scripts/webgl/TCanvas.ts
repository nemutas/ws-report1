import * as THREE from 'three'
import { gl } from './core/WebGL'
import { controls } from './utils/OrbitControls'
import { Assets, loadAssets } from './utils/assetLoader'
import { gsap } from 'gsap'
import GUI from 'lil-gui'

export class TCanvas {
  private lights = new THREE.Group()
  private tailes = new THREE.Group()
  private runTailAnimation = false
  private gui = new GUI()

  private tailParams = {
    width: 1,
    height: 1,
    depth: 0.3,
    gap: 0.1,
    amount: 20,
  }

  private assets: Assets = {
    envMap: { path: 'images/blocky_photo_studio_1k.hdr' },
  }

  constructor(private container: HTMLElement) {
    loadAssets(this.assets).then(() => {
      this.init()
      this.createLights()
      this.createObjects()
      gl.requestAnimationFrame(this.anime)
    })
  }

  private init() {
    gl.setup(this.container)
    gl.scene.background = new THREE.Color('#0a0a0a')
    gl.camera.position.set(0, 0, 15)

    controls.primitive.enablePan = false

    gl.setStats(this.container)
    gl.visibleStats = false

    const axesHelper = new THREE.AxesHelper(5)
    gl.scene.add(axesHelper)
    axesHelper.visible = false

    this.gui.close()
    this.gui.add(axesHelper, 'visible').name('axes helper')
    const obj = { stats: false }
    this.gui.add(obj, 'stats').onChange((value: boolean) => {
      gl.visibleStats = value
    })
  }

  private createLights() {
    this.lights = new THREE.Group()
    gl.scene.add(this.lights)

    const ambientLight = new THREE.AmbientLight('#fff', 0.15)
    this.lights.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight('#fff', 0.3)
    directionalLight.position.set(10, 10, 10)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.set(2048, 2048)
    const edge = 10
    directionalLight.shadow.camera = new THREE.OrthographicCamera(-edge, edge, edge, -edge, 0.1, 30)
    this.lights.add(directionalLight)

    const helper = new THREE.CameraHelper(directionalLight.shadow.camera)
    gl.scene.add(helper)
    helper.visible = false

    this.gui.add(helper, 'visible').name('directional light helper')
  }

  private createObjects() {
    // geometryとmaterialは共通で使う
    const tailGeometry = new THREE.BoxGeometry(this.tailParams.width, this.tailParams.height, this.tailParams.depth)
    const tailBlackMaterial = new THREE.MeshStandardMaterial({ color: '#080808' })
    const tailGoldMaterial = new THREE.MeshStandardMaterial({
      color: '#dfad23',
      envMap: this.assets.envMap.data as THREE.Texture,
      envMapIntensity: 0.03,
      metalness: 1,
      roughness: 0.3,
    })

    // 尻尾を20コ生成する
    for (let i = 0; i < 20; i++) {
      this.createBoxTail(i, tailGeometry, tailBlackMaterial, tailGoldMaterial)
    }

    // 尻尾をまとめたグループを追加する
    gl.scene.add(this.tailes)
  }

  private createBoxTail(num: number, geometry: THREE.BoxGeometry, black: THREE.MeshStandardMaterial, gold: THREE.MeshStandardMaterial) {
    // 1本の尻尾は、+zを基準に作成する。使いたい mesh.lookAt 関数が、+z面がどこを向くかを定義しているため。
    // 最後にランダムな回転軸に対してランダムな回転をさせる。

    const { amount, gap, depth: thickness } = this.tailParams

    // Boxの位置の計算
    const calcPosition = (i: number) => {
      let scale = 1 - i / amount
      let x = Math.sin(Math.PI * 2 * (i / amount)) * scale
      let y = (Math.cos(Math.PI * 2 * (i / amount)) - 1) * scale
      const z = i * (thickness + gap)
      return { x, y, z }
    }

    let prev = calcPosition(-1)

    const group = new THREE.Group()
    this.tailes.add(group)

    for (let i = 0; i < amount; i++) {
      const mesh = new THREE.Mesh(geometry, num % 4 === 0 ? gold : black)
      mesh.visible = false
      mesh.castShadow = true
      mesh.receiveShadow = true
      const pos = calcPosition(i)
      mesh.position.set(pos.x, pos.y, pos.z)
      mesh.scale.set(1 - i / amount, 1 - i / amount, 1)
      // 向きを前のBoxに向かせる
      mesh.lookAt(prev.x, prev.y, prev.z)
      prev = pos
      group.add(mesh)
    }

    // 1本の尻尾をランダムに回転させる
    this.calcTailRotation(group)
  }

  private calcTailRotation(tail: THREE.Object3D) {
    const rand = () => Math.random() * 2 - 1
    tail.rotateOnAxis(new THREE.Vector3(rand(), rand(), rand()).normalize(), Math.random() * Math.PI * 2)
  }

  // ----------------------------------
  // animation
  private gsapAnimation() {
    this.runTailAnimation = true

    const tl = gsap.timeline()
    this.tailes.children.forEach((tail) => {
      tl.set(tail.children, { visible: true, stagger: 0.05 }, '<10%')
    })

    this.tailes.children.forEach((tail, i) => {
      tl.set(tail.children, { visible: false, stagger: 0.05, delay: i === 0 ? 5 : 0 }, '<5%')
    })

    tl.set(this, { runTailAnimation: false, delay: 1 })
  }

  private anime = () => {
    this.lights.quaternion.copy(gl.camera.quaternion)

    if (!this.runTailAnimation) {
      this.tailes.children.forEach((tail) => this.calcTailRotation(tail))
      this.gsapAnimation()
    }

    controls.update()
    gl.render()
  }

  // ----------------------------------
  // dispose
  dispose() {
    gl.dispose()
  }
}
