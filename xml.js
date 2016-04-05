/**
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * Copyright (c) 2012 Sam Tsvilik
 * Licensed under the MIT, GPL licenses.
 *
 * @name xml
 * @version 1.1
 * @author Sam Tsvilik
 * @description
 * This is a super light and simple XML to JSON converter.
 * All it does is scans through child elements of your XML and builds out a JSON structure.
 * To avoid attribute vs. node name conflicts - All attribute entities are prefixed with "@" (i.e. <node attr="1"/> == {node: {"@attr":"1"}} )
 * Text or CDATA value will always be inside a "Text" property (i.e. myNodeObj.Text == <myNodeObj>Hello</myNodeObj> - Hello)
 * Node siblings with the same name will be automatically converted into arrays, else if node is singular it will just be an Object
 */

;(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.xml = factory();
  }
}(this, function() {
  /** @lends xml */

  //Trim polyfill (thanks gist: 1035982)
  ''.trim || (String.prototype.trim = function() {
    return this.replace(/^[\s\uFEFF]+|[\s\uFEFF]+$/g, '');
  });

  var NULL = null,
    FALSE = !1,
    TRUE = !0,
    NODE_TYPES = {
      Element: 1,
      Attribute: 2,
      Text: 3,
      CDATA: 4,
      Root: 9,
      Fragment: 11
    },
    XMLConverter;

  /**
   * Parses XML string and returns an XMLDocument object
   * @param  {String} strXML XML Formatted string
   * @return {XMLDocument|XMLElement}
   */

  function parseXMLString(strXML) {
    var xmlDoc = NULL,
      out = NULL,
      isParsed = TRUE;
    try {
      if (typeof module === 'object' && module.exports) {
        xmlDoc = new (require('xmldom').DOMParser);
      } else {
        xmlDoc = "DOMParser" in window ? new DOMParser : new ActiveXObject("MSXML2.DOMDocument");
        xmlDoc.async = FALSE;
      }
    } catch (e) {
      throw new Error("XML Parser could not be instantiated");
    }

    if ("parseFromString" in xmlDoc) {
      out = xmlDoc.parseFromString(strXML, "text/xml");
      isParsed = (out.documentElement.tagName !== "parsererror");
    } else { //If old IE
      isParsed = xmlDoc.loadXML(strXML);
      out = (isParsed) ? xmlDoc : FALSE;
    }
    if (!isParsed) {
      throw new Error("Error parsing XML string");
    }
    return out;
  }

  function onlyText(obj) {
    return obj && obj.Text && size(obj) == 1;
  }

  function keys(collection) {
    var c = 0,
      i;
    if (collection) {
      for (i in collection) {
        c++;
      }
    }
    return c;
  }

  function size(collection) {
    var length = collection ? collection.length : 0;
    return typeof length == 'number' ? length : keys(collection);
  }

  XMLConverter = {
    isUnsafe: FALSE,
    isXML: function(o) {
      return (typeof(o) === "object" && o.nodeType !== undefined);
    },
    getRoot: function(doc) {
      return (doc.nodeType === NODE_TYPES.Root) ? doc.documentElement : (doc.nodeType === NODE_TYPES.Fragment) ? doc.firstChild : doc;
    },
    /**
     * Begins the conversion process. Will automatically convert XML string into XMLDocument
     * @param  {String|XMLDocument|XMLNode|XMLElement} xml XML you want to convert to JSON
     * @return {JSON} JSON object representing the XML data tree
     */
    convert: function(xml) {
      var out = {},
        xdoc = typeof(xml) === "string" ? parseXMLString(xml) : this.isXML(xml) ? xml : undefined,
        root;
      if (!xdoc) {
        throw new Error("Unable to parse XML");
      }
      //If xdoc is just a text or CDATA return value
      if (xdoc.nodeType === NODE_TYPES.Text || xdoc.nodeType === NODE_TYPES.CDATA) {
        return xdoc.nodeValue;
      }
      //Extract root node
      root = this.getRoot(xdoc);

      var nodename = this.getNodeName(root);
      //Create first root node
      out[nodename] = {};
      //Start assembling the JSON tree (recursive)
      this.process(root, out[nodename]);
      //Parse JSON string and attempt to return it as an Object
      return out;
    },
    /**
     * Get nodeName without prefix (namespace)
     * @param  {XMLNode} node Any XML node
     * @return {String} node name
     * */
    getNodeName: function(node) {
      if (node.prefix) {
        return node.nodeName.replace(node.prefix + ':', '');
      }
      return node.nodeName;
    },
    /**
     * Recursive xmlNode processor. It determines the node type and processes it accordingly.
     * @param  {XMLNode} node Any XML node
     * @param  {Object} buff Buffer object which will contain the JSON equivalent properties
     */
    process: function(node, buff) {
      var child, attr, name, att_name, value, i, j, tmp, iMax, jMax, data;
      if (node.hasChildNodes()) {
        iMax = node.childNodes.length;
        for (i = 0; i < iMax; i++) {
          child = node.childNodes[i];
          //Check nodeType of each child node
          switch (child.nodeType) {
            case NODE_TYPES.Text:
              //If parent node has both CDATA and Text nodes, we just concatinate them together
              buff.Text = buff.Text ? buff.Text + child.nodeValue.trim() : child.nodeValue.trim();
              break;
            case NODE_TYPES.CDATA:
              //If parent node has both CDATA and Text nodes, we just concatinate them together
              value = child[child.text ? "text" : "nodeValue"]; //IE attributes support
              buff.Text = buff.Text ? buff.Text + value : value;
              break;
            case NODE_TYPES.Element:
              name = this.getNodeName(child);
              tmp = {};
              this.process(child, tmp);

              //Node name already exists in the buffer and it's a NodeSet
              if (tmp && size(tmp) > 0) {
                data = tmp;
                if (onlyText(tmp)) {
                  data = tmp.Text;
                } else
                if (tmp.Text && tmp.Text.length === 0) {
                  tmp.Text == null;
                }

                if (name in buff) {
                  if (buff[name].length && buff[name].push) {
                    buff[name].push(data);
                  } else { //If node exists in the parent as a single entity
                    buff[name] = [buff[name], data];
                  }
                } else { //If node does not exist in the parent
                  buff[name] = data;
                }
              }
              break;
          }
        }
      }
      //Populate attributes
      if (node.attributes.length) {
        for (j = node.attributes.length - 1; j >= 0; j--) {
          attr = node.attributes[j];
          att_name = attr.name.trim();
          value = attr.value;
          buff[(this.isUnsafe ? "" : "@") + att_name] = value;
        }
      }
    }
  };

  return {
    /**
     * Public API to convert XML to JSON
     * @param  {String | XMLDocument} xml Any XML type
     * @param {Boolean} unsafe Allows unsafe processing that does not prefixes attributes with '@' character. It is considered unsafe bacause attribute names may collide with node names.
     * @return {JSON}     JSON object
     */
    xmlToJSON: function(xml, unsafe) {
      XMLConverter.isUnsafe = (unsafe !== undefined) ? unsafe : FALSE;
      return XMLConverter.convert(xml);
    }
  };
}));
