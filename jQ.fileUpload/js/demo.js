jQuery(document).ready(function() {
	jQuery('div.uplContainer').bsFileUpload({
		thumbSize : [240, 180],
		uplDrop : function(e, count, files) {
			console.info("Something dropped!");
		}
	});
});