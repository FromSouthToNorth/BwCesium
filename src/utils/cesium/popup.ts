import { SceneTransforms } from 'cesium'

class CesiumPopup {
  constructor(options) {
    this.viewer = options.viewer;
    this.position = options.position;           // Cartesian3 世界坐标
    this.title = options.title || '信息';
    this.content = options.content || '';
    this.offset = options.offset || [0, 30];   // 像素偏移

    // 创建 DOM 元素
    this.element = document.createElement('div');
    this.element.className = 'cesium-custom-popup';
    this.element.style.cssText = `
            position: absolute;
            background: rgba(0,0,0,0.85);
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            min-width: 220px;
            max-width: 360px;
            font-size: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.6);
            pointer-events: auto;
            transform: translate(${-50 + this.offset[0]}%, ${-100 + this.offset[1]}%);
            z-index: 1000;
            display: none;
        `;

    this.element.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid #555;padding-bottom:6px;">
                <h3 style="margin:0;font-size:16px;">${this.title}</h3>
                <span style="cursor:pointer;font-size:20px;" class="popup-close">x</span>
            </div>
            <div>${this.content}</div>
        `;

    this.element.querySelector('.popup-close').addEventListener('click', () => {
      this.remove();
      this.onClose();
    });

    // 可选：Esc 键关闭
    this._escListener = (e) => {
      if (e.key === 'Escape') {
        this.remove();
        this.onClose();
        document.removeEventListener('keydown', this._escListener);
      }
    };
    document.addEventListener('keydown', this._escListener);

    // 添加到 viewer 容器
    this.viewer.container.appendChild(this.element);

    // 绑定 postRender 事件（相机移动/缩放时更新位置）
    this._removePostRender = this.viewer.scene.postRender.addEventListener(() => {
      this.updatePosition();
    });
  }

  onClose() {
    this.element.style.display = 'none '
  }

  updatePosition() {
    if (!this.position) return;

    // 世界坐标 → 屏幕坐标
    const screenPos = SceneTransforms.worldToWindowCoordinates(
      this.viewer.scene,
      this.position
    );

    if (!screenPos) {
      this.element.style.display = 'none';
      return;
    }

    // 应用偏移
    const x = screenPos.x;
    const y = screenPos.y;
    this.element.style.left = x + 'px';
    this.element.style.top = y + 'px';
    this.element.style.display = 'block';
  }

  show() {
    this.element.style.display = 'block';
    this.updatePosition(); // 立即更新一次
  }

  remove() {
    if (this._removePostRender) {
      this._removePostRender();
      this._removePostRender = null;
    }
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

export { CesiumPopup }
