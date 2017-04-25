# Offline image reference selector


Intended for offline apps only. Select a referenced entity object from a list of icons rather than a drop down. Optionally commit the object and close the page.

After selection of an item, optionally other attributes of the selected item may be copied to the context object. This is useful for conditional visibility.
 
## Properties

For widgets allowed in offline navigation, no entity/attribute selection is allowed. So everything needs to be typed in.

### Data source

- _Selectable objects_ - Selectable objects entity, in module.entity format. The image will be rendered if it is a specialization of System.Image
- _Association to set_ - Association from the context object to the selectable objects entity, in module.association format.
- _Additional attributes_ - Optionally, one or more attributes of the selected object can be copied to attributes of the context object.
- _Show image_ - Render image if entity is specialization of System.Image. Turn off to display an image using CSS.
- _Caption_ - Optional, caption to be displayed.
- _Value_ - Value that identifies this item, set as attribute value on the element for CSS selection
- _Sort on_ - Sort list on this attribute.
- _Sort direction_ - Sort ascending or descending.
- _Constraints_ - Constraints on the selectable objects, as specified for the getSlice client function
- _Subscribe topic_ - The widget will use Dojo subscribe on topic-EntityName.GUID

The subscribe topic can be used when this widget needs to react to changed made by another custom widget. This can be used in application specific widgets.

### Behavior

- _Close page_ - If true, close the page after an item is selected.  The object is committed too.

### Styling

By default all items are 100x100 pixels. Usually you will need to adapt to the images used in the widget.

Each element can be styled individually. You can also give the widget on the Mendix page a specific name and overrule styling in CSS using that name and the classes put on each element.

