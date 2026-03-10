import { SceneTransforms, Matrix4 } from 'cesium'
import { select as d3_select } from 'd3-selection';
import { isArray } from './is'

let _menu = d3_select(null);

let _removePostRender = null
const lastCamera = new Matrix4();
export function utilMenu(context) {
  const editMenu = function () {
    const { menuItems: mItems, data, type, viewer, position } = context;
    let menuItems = mItems;
    console.log('editMenu: ', context);

    if (data && isArray(data.contextmenu) && data.contextmenu.length) {
      menuItems = [...mItems, ...getMenu(data.contextmenu)];
    }
    console.log('menuItems: ', menuItems);

    if (!isArray(menuItems) || !menuItems.length) return;
    let container = d3_select(viewer.container)
    _removePostRender = viewer.scene.postUpdate.addEventListener(() => {
      if (Matrix4.equalsEpsilon(viewer.scene.camera.viewMatrix, lastCamera, 0.0001)) return;
      Matrix4.clone(viewer.scene.camera.viewMatrix, lastCamera);
      updatePosition;
    })
    if (container.empty()) {
      container = d3_select('#cesiumContainer');
    }
    const sourceTarget = context.sourceTarget;

    const rect = container.node()
      .getBoundingClientRect();

    const _vpBottomMargin = 25; // 视口底部边距

    const _verticalPadding = 4;

    let _menuWidth;

    const _menuSideMargin = 10;

    d3_select(document)
      .on('click.showEditMenu', function () {
        editMenu.remove();
      });

    const buttonHeight = 32;
    _menuWidth = 44;


    _menu = container.append('div')
      .attr('class', 'edit-menu')
      .style('padding', _verticalPadding + 'px 0')
      .style('z-index', 1000);

    const buttons = _menu.selectAll('.edit-menu-item')
      .data(menuItems);
    let buttonsEnter
    const _menuHeight = _verticalPadding * 2 + menuItems.length * buttonHeight;

    switch (type) {
      case 'dropdown': // 下拉菜单类型
        console.log('editMenu: type is dropdown');
        buttonsEnter = buttons.enter()
          .append('div')
          .attr('class', 'edit-menu-item dropdown')
          .style('height', buttonHeight + 'px')

        const menuContainers = buttonsEnter.append("div")
          .attr("class", "menu-dropdown-content")

        menuContainers.selectAll('.menu-button')
          .data(d => d.menu)
          .enter()
          .append('button')
          .attr('data-tooltip', d => {
            let url = d.url ? d.url : '';
            if (url.length > 80) {
              url = url.substring(0, 80) + '...';
            }
            return url.length > 0 ? url : null;
          })
          .attr('class', (d) => {
            return 'menu-button' + (d.url ? ' tooltip' : '');
          })
          .text(d => d.title)
          .on('click', click);

        buttonsEnter.on('mouseover', function () {
          const dropdown = d3_select(this).select('.menu-dropdown-content')
          dropdown.style('display', 'block');
          updateDropdownPosition(dropdown);
        }).on('mouseout', function () {
          d3_select(this).select('.menu-dropdown-content')
            .style('display', 'none');
        });
        break;
      default: // 默认类型
        buttonsEnter = buttons.enter()
          .append('button')
          .attr('class', (d) => {
            return 'edit-menu-item' + (d.url ? ' tooltip' : '');
          })
          .attr('data-tooltip', (d) => {
            let url = d.url ? d.url : '';
            if (url.length > 80) {
              url = url.substring(0, 80) + '...';
            }
            return url.length > 0 ? url : null;
          })
          .style('height', buttonHeight + 'px')
          .on('click', click);
    }

    if (buttonsEnter) {
      buttonsEnter.each(function (d) {
        d3_select(this)
          .append('div')
          .text(d.title);
      });

      buttonsEnter.merge(buttons)
        .classed('disabled', function (d) {
          return d.disabled;
        });
    }

    updatePosition();

    function click(d3_event, d) {
      d3_event.stopPropagation();
      if (typeof d.operation === 'function') {
        d.sourceTarget = sourceTarget;
        d.originEvent = d3_event;
        d.operation(d);
      }
      editMenu.remove();
    }

    function updateDropdownPosition(dropdown) {
      const { width, height } = rect
      const { width: dw, height: dh, x, y } = dropdown.node().getBoundingClientRect();
      const anchorLoc = [dw + x + 10, dh + y + 10];
      if (anchorLoc[0] > width) {
        // 如果下拉菜单超出右边界，则将其向左对齐
        dropdown.style('left', `-${anchorLoc[0] - width}px`);
      }
      if (anchorLoc[1] > height) {
        // 如果下拉菜单超出下边界，则将其向上对齐
        dropdown.style('top', `-${anchorLoc[1] - height}px`);
      }
    }

    function updatePosition() {
      const pos = SceneTransforms.worldToWindowCoordinates(
        viewer.scene,
        position,
      )

      if (!pos || !_menu || _menu.empty()) return;
      // const { x, y } = sourceTarget.originXY;
      const anchorLoc = [pos.x, pos.y];
      if (anchorLoc[0] < 0 ||
        anchorLoc[0] > rect.weight ||
        anchorLoc[1] < 0 ||
        anchorLoc[1] > rect.height) {
        editMenu.remove();
        return;
      }
      const menuRect = _menu.node()
        .getBoundingClientRect();
      _menuWidth = menuRect.width;

      const menuLeft = displayOnLeft();

      const offset = [0, 0];
      offset[0] = menuLeft ? -1 * (_menuSideMargin + _menuWidth) : _menuSideMargin;

      if (anchorLoc[1] + _menuHeight > (rect.height - _vpBottomMargin)) {
        // menu is near bottom viewport edge, shift upwards
        offset[1] = -anchorLoc[1] - _menuHeight + rect.height - _vpBottomMargin;
      } else {
        offset[1] = 0;
      }

      const origin = geoVecAdd(anchorLoc, offset);

      _menu
        .style('left', origin[0] + 'px')
        .style('top', origin[1] + 'px');

      function displayOnLeft() {
        if ((anchorLoc[0] + _menuSideMargin + _menuWidth) > rect.width) {
          // right menu would be too close to the right viewport edge, go left
          return true;
        }
        // prefer right menu
        return false;
      }

      function geoVecAdd(a, b) {
        return [a[0] + b[0], a[1] + b[1]];
      }
    }
  };
  editMenu.updatePosition = function () {
    console.log('updatePosition: ', d3_select('.edit-menu'));
  }

  editMenu.remove = function () {
    d3_select(window)
      .on('click.showEditMenu', null);
    _menu.remove();
    if (_removePostRender) {
      _removePostRender();
      _removePostRender = null;
    }
  };

  return editMenu;
}

const MENUS = new Map([
  ['showLRPoint', showLRPoint]
]);

/**
 *
 * @param {*} context
 */
export function showLRPoint({ relatedTarget }) {
  console.log('showLRPoint: ', relatedTarget);
  // 处理可能为 undefined 的情况
  const layer = relatedTarget?.layer;
  if (!layer) return;

  const options = layer.options ?? {};
  const data = options.data ?? {};
  const { rightPt, leftPt, lx, ly, lz, rx, ry, rz } = data;

  const { LRMarkerFeatureGroup, map } = store.getters;

  // 检查必要对象是否存在
  if (!LRMarkerFeatureGroup || !map) return;

  LRMarkerFeatureGroup.clearLayers();

  // 创建 marker 的通用函数
  function createMarker(position, className, tooltipText, popupContent) {
    if (!position?.B || !position?.L) return null;

    return L.marker([position.B, position.L], {
      icon: L.divIcon({
        iconSize: [8, 8],
        className: `lr-marker-icon ${className}`,
      }),
    })
      .bindPopup(popupContent)
      .bindTooltip(tooltipText, { permanent: true });
  }

  const leftPopup = `<p>x: ${lx}</p><p>y: ${ly}</p><p>z: ${lz}</p>`;
  const rightPopup = `<p>x: ${rx}</p><p>y: ${ry}</p><p>z: ${rz}</p>`;

  const leftMarker = createMarker(leftPt, 'left-marker', '左', leftPopup);
  const rightMarker = createMarker(rightPt, 'right-marker', '右', rightPopup);

  if (leftMarker) LRMarkerFeatureGroup.addLayer(leftMarker);
  if (rightMarker) LRMarkerFeatureGroup.addLayer(rightMarker);

  // 确保有图层后再获取边界
  if (!LRMarkerFeatureGroup.getLayers().length) return;

  try {
    map.fitBounds(LRMarkerFeatureGroup.getBounds().pad(1.8));
  } catch (error) {
    console.error('fitBounds error:', error);
  }
}

export function getMenu(contextmenu) {
  return contextmenu.map(({ text: title, callback }) => {
    return {
      title,
      operation: MENUS.get(callback)
    }
  });
}
