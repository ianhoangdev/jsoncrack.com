import React, { useState } from "react";
import styled from "styled-components";
import type { CustomNodeProps } from ".";
import useConfig from "../../../../../store/useConfig";
import useGraph from "../stores/useGraph";
import useJson from "../../../../../store/useJson";
import { isContentImage } from "../lib/utils/calculateNodeSize";
import { TextRenderer } from "./TextRenderer";
import * as Styled from "./styles";

const StyledTextNodeWrapper = styled.span<{ $isParent: boolean }>`
  display: flex;
  justify-content: ${({ $isParent }) => ($isParent ? "center" : "flex-start")};
  align-items: center;
  height: 100%;
  width: 100%;
  overflow: hidden;
  padding: 0 10px;
`;

const StyledImageWrapper = styled.div`
  padding: 5px;
`;

const StyledImage = styled.img`
  border-radius: 2px;
  object-fit: contain;
  background: ${({ theme }) => theme.BACKGROUND_MODIFIER_ACCENT};
`;

const Node = ({ node, x, y }: CustomNodeProps) => {
  const { text, width, height, id, path } = node;
  const imagePreviewEnabled = useConfig(state => state.imagePreviewEnabled);
  const isImage = imagePreviewEnabled && isContentImage(JSON.stringify(text[0].value));
  const value = text[0].value;
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const setSelectedNode = useGraph(state => state.setSelectedNode);
  const nodes = useGraph(state => state.nodes);
  const setGraph = useGraph(state => state.setGraph);
  const setJson = useJson(state => state.setJson);
  const json = useJson(state => state.json);

  // Helper to update value in JSON
  const updateJsonValue = (newValue: string | number | null) => {
    try {
      // Parse current JSON
      const parsed = JSON.parse(json);
      // Traverse to path and update value
      let ref = parsed;
      if (path && path.length > 0) {
        for (let i = 0; i < path.length - 1; i++) {
          ref = ref[path[i]];
        }
        ref[path[path.length - 1]] = newValue;
      }
      setJson(JSON.stringify(parsed, null, 2));
    } catch (e) {
      // fallback: do nothing
    }
  };

  const handleEdit = () => {
    setEditing(true);
    setEditValue(value);
  };

  const handleSave = () => {
    // Update node value in graph
    const updatedNodes = nodes.map(n => {
      if (n.id === id) {
        const newText = [...n.text];
        newText[0] = { ...newText[0], value: editValue };
        return { ...n, text: newText };
      }
      return n;
    });
    setGraph(undefined, [{ nodes: updatedNodes }]);
    updateJsonValue(editValue);
    setEditing(false);
    setSelectedNode({ ...node, text: [{ ...node.text[0], value: editValue }] });
  };

  const handleCancel = () => {
    setEditing(false);
    setEditValue(value);
  };

  return (
    <Styled.StyledForeignObject
      data-id={`node-${id}`}
      width={width}
      height={height}
      x={0}
      y={0}
    >
      {isImage ? (
        <StyledImageWrapper>
          <StyledImage src={JSON.stringify(text[0].value)} width="70" height="70" loading="lazy" />
        </StyledImageWrapper>
      ) : (
        <StyledTextNodeWrapper
          data-x={x}
          data-y={y}
          data-key={JSON.stringify(text)}
          $isParent={false}
        >
          {editing ? (
            <>
              <input
                type="text"
                value={editValue as string}
                onChange={e => setEditValue(e.target.value)}
                style={{ width: "70px", marginRight: "8px" }}
              />
              <button onClick={handleSave} style={{ marginRight: "4px" }}>Save</button>
              <button onClick={handleCancel}>Cancel</button>
            </>
          ) : (
            <>
              <Styled.StyledKey $value={value} $type={typeof text[0].value}>
                <TextRenderer>{value}</TextRenderer>
              </Styled.StyledKey>
              <button onClick={handleEdit} style={{ marginLeft: "8px" }}>Edit</button>
            </>
          )}
        </StyledTextNodeWrapper>
      )}
    </Styled.StyledForeignObject>
  );
};

function propsAreEqual(prev: CustomNodeProps, next: CustomNodeProps) {
  return prev.node.text === next.node.text && prev.node.width === next.node.width;
}

export const TextNode = React.memo(Node, propsAreEqual);
