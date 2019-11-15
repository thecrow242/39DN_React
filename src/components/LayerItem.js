import React from 'react';

export const LayerItem = props => {
    const { chkId, chkText, fontColor, handleClick } = props

    return (
        <tr>
            <td className="layerItem">
                <label style={{color: fontColor}} htmlFor={'chk'+chkId}>
                    <input type="checkbox" id={'chk'+chkId} onClick={handleClick} />
                    {chkText}
                </label>
            </td>
        </tr>
    )
}

export default LayerItem;